'use strict';
var fs = require('fs');
var nconf = require('nconf');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var helpers = require('./helpers');
var NodeCache = require("node-cache");
var uuid = require('uuid');
//this object will map the images SHA256 sums with their captions
var sha256Captions = new NodeCache({stdTTL: 60*30, checkperiod: 11});
//this contains the list of files waiting to be captioned, in the form {path:'/something/something.ext',sha256sum:'...'}
var pending = [];

//application configuration, use the CLI args, the env variables and then, if nothing was found, the default values
nconf.argv().env();

nconf.defaults({
    port: 5000,
    modelPath: '/mounted/model/model_id1-501-1448236541.t7_cpu.t7',
    processFolder: '/mounted/Downloads/',
    useGPU: '-1'
  });

var runNeuralTalk = function(callback){
var spawn = require('child_process').spawn;
var ntprocess = spawn('th', ['eval.lua','-model',nconf.get('modelPath'),'-image_folder',nconf.get('processFolder'),'-gpuid',nconf.get('useGPU'),'-dump_path','1'],{cwd:'/neuraltalk2/'});

ntprocess.stdout.on('data', function (data) {
  console.log('stdout: ' + data);
});

ntprocess.stderr.on('data', function (data) {
  console.log('stderr: ' + data);
});

ntprocess.on('close', function (code) {
  console.log('child process exited with code ' + code);
});

};
app.use(express.static('static'));
app.use(bodyParser.json({limit: '6mb'}));

app.get('/test',function(req,res){
console.log("running the command...");
runNeuralTalk();
});

app.post('/addURL',function(req,http_res){
if(typeof req.body.url !== 'string'){
http_res.status(400).json({error:"url field must be present and be a string containing the URL of the image to process"});
return;
}
var url = req.body.url;
var newpath = '/tmp/'+uuid.v1();
console.log("trying to add the URL "+url+"...");
helpers.downloadFile(url,newpath,function(err,res){
if(err){
http_res.status(400).json(err);
return;
}
//add the extension to the filename
fs.rename(newpath,newpath+'.'+res.extension);
pending.push({path:newpath+'.'+res.extension,sha256sum:res.sha256sum});
http_res.json(res);
});
});

//start the server
server.listen(nconf.get('port'), function () {
    var port = server.address().port;
    console.log(' Application started on port', port);
  });
