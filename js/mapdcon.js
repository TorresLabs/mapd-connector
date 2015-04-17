(function(exports){
  mapdcon.version= "1.0";
  exports.mapdcon = mapdcon;

  function mapdcon() {
    var mapdcon = {
      setPlatform: setPlatform,
      setHost: setHost,
      setUser: setUser,
      setPort: setPort,
      setDbName: setDbName,
      connect: connect,
      disconnect: disconnect,
      query: query,
      getDatabases: getDatabases,
      getTables: getTables,
      getFields: getFields,
      getPlatform: getPlatform,
      getClient: getClient
    }
  
    var host = "192.168.1.8";
    var user = "mapd";
    var password = "HyperInteractive"; // to be changed 
    var port = "9090";
    var dbName = null;
    var transport = null;
    var protocol = null;
    var client = null;
    var sessionId = null;
    var datumEnum = {};

    function setPlatform(newPlatform) {
      //dummy function for now
      return mapdcon;
    }

    function getPlatform() {
      return "mapd";
    }
    function getClient() {
      return client;
    }

    function setHost(newHost) {
      host = newHost;
      return mapdcon;
    }

    function setUser (newUser) {
      user = newUser;
      return mapdcon;
    }

    function setPort (newPort) {
      port = newPort;
      return mapdcon;
    }

    function setDbName (newDb) {
      dbName = newDb;
      return mapdcon;
    }

    function testConnection() {
      if (sessionId == null)  {
        return false;
        //throw "Client not connected";
      }
      return true;
    }


    function connect() {
      transport = new Thrift.Transport("http://" + host + ":" + port);
      protocol = new Thrift.Protocol(transport);
      client = new MapDClient(protocol);
      sessionId = client.connect(user, password, dbName);
      return mapdcon;
    }

    function disconnect() {
      if (sessionId != null) {
        client.disconnect(sessionId);
        sessionId = null;
      }
      client = null;
      protocol = null;
      transport = null;
    }

    function query(query) {
      testConnection();
      var result = null;
      try {
        result = client.sql_execute(sessionId,query + ";");
      }
      catch (err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          // try one more time
          result = client.sql_execute(sessionId,query + ";");
        }
      }
      var formattedResult = {};
      formattedResult.fields = [];
      var numCols = result.proj_info.length;
      var colNames = [];
      for (var c = 0; c < numCols; c++) {
        var field = result.proj_info[c]; 
        formattedResult.fields.push({"name": field.proj_name, "type": datumEnum[field.proj_type.type]});
      }
      formattedResult.results = [];
      var numRows = result.rows.length;
      for (var r = 0; r < numRows; r++) {
        var row = {};
        for (var c = 0; c < numCols; c++) {
          var fieldName = formattedResult.fields[c].name;
          var fieldType = formattedResult.fields[c].type;
          switch (fieldType) {
            case "INT":
              row[fieldName] = result.rows[r].cols[c].datum.int_val;
              break;
            case "REAL":
              row[fieldName] = result.rows[r].cols[c].datum.real_val;
              break;
            case "STR":
              row[fieldName] = result.rows[r].cols[c].datum.str_val;
              break;
            case "TIME":
            case "TIMESTAMP":
            case "DATE":
              row[fieldName] = new Date(result.rows[r].cols[c].datum.int_val * 1000);
              break;
          }
        }
        formattedResult.results.push(row);
      }
      //console.log(query);
      //console.log(formattedResult.results);
      return formattedResult.results;
    }

    function getDatabases () {
      testConnection();
      var databases = null;
      try {
        databases = client.getDatabases();
      }
      catch (err) {
        if (err.name == "ThriftException") {
          connect();
          databases = client.getDatabases();
        }
      }
      var dbNames = [];
      $(databases).each(function(){dbNames.push(this.db_name)});
      return dbNames;
    }

    function getTables() {
      testConnection();
      var tabs = null;
      try {
        tabs = client.getTables(sessionId);
      }
      catch (err) {
        if (err.name == "ThriftException") {
          connect();
          tabs = client.getTables(sessionId);
        }
      }

      var numTables = tabs.length;
      var tableInfo = [];
      for (var t = 0; t < numTables; t++) {
        tableInfo.push({"name": tabs[t], "label": "obs"});
      }
      return tableInfo; 
    }

    function invertDatumTypes() {
      for (key in TDatumType) {
        datumEnum[TDatumType[key]] = key;
      }
    }

    function getFields(tableName) {
      testConnection();
      var fields = client.getColumnTypes(sessionId,tableName);
      var fieldsArray = [];
      // silly to change this from map to array 
      // - then later it turns back to map
      for (key in fields) {
        fieldsArray.push({"name": key, "type": datumEnum[fields[key].type]});
      }
      return fieldsArray;
    }
    invertDatumTypes();
    return mapdcon;
  }

})(typeof exports !== 'undefined' && exports || this);