'use strict';
var fs = require('fs');
var nconf = require('nconf');
var express = require('express');
var app = express();
var server = require('http').createServer(app);


nconf.argv().env();

nconf.defaults({
    'port': 5000
  });

app.use(express.static('/static'));



//start the server
server.listen(nconf.get('port'), function () {
    var port = server.address().port;
    console.log(' Application started on port', port);
  });
