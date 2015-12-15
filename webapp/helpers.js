'use strict';

var http = require('http');
var https = require('https');
var fs = require('fs');
var readChunk = require('read-chunk'); 
var fileType = require('file-type');
var crypto = require('crypto');

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
    var hasher = crypto.createHash('sha256');
    hasher.setEncoding('hex');
    response.pipe(hasher);
    response.pipe(file);
    file.on('finish', function() {
      file.close(function(err,resp){
        if(err){
          cb(err);
          return;
        }
        hasher.end();
        var thisHash = hasher.read();
        var fType = fileType(readChunk.sync(dest, 0, 262));
        if(fType === null){
          cb({error:"cannot determine file type, is the URL correct?"});
          return;
        }
        var detectedFileType = fType.ext;
        cb(err,{response:resp,extension:detectedFileType, sha256sum:thisHash}); 
      });
    });
  });
};


/**
 * Ugly but working helper to retrieve a file fromt he local FS instead of an URl
 * */
module.exports.retrieveLocalFile = function(source, dest, cb) {
  var file = fs.createWriteStream(dest);
  var response = fs.createReadStream(source);  
  var hasher = crypto.createHash('sha256');
  hasher.setEncoding('hex');
  response.pipe(hasher);
  response.pipe(file);
  file.on('finish', function() {
    file.close(function(err,resp){
      if(err){
        cb(err);
        return;
      }
      hasher.end();
      var thisHash = hasher.read();
      var fType = fileType(readChunk.sync(dest, 0, 262));
      if(fType === null){
        cb({error:"cannot determine file type, is the URL correct?"});
        return;
      }
      var detectedFileType = fType.ext;
      cb(err,{response:resp,extension:detectedFileType, sha256sum:thisHash});
    });
  });
};



//shamelessly copied from http://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
module.exports.cp = function(source, target, cb){
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}
