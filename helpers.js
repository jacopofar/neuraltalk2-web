'use strict';

var http = require('http');
var https = require('https');
var fs = require('fs');

module.exports.downloadFile = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var protocolhandler;
  if(url.indexOf('http:') === 0){
    protocolhandler = http;
  }
  
  if(url.indexOf('https:') === 0){
    protocolhandler = https;
  }
  if(typeof protocolhandler === 'undefined'){
    cb({error:'unknown protocol for the url '+url+', must be http or https'});
    return;
  }
  var request = protocolhandler.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(function(err,resp){
        cb(err,{response:resp,mimetype:response.headers['content-type']}); 
      });
    });
  });
}  
