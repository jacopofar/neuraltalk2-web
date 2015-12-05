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
var isAlreadyRunning = false;

//latest result form image processing
var latestOutcome = {timestamp:new Date().toISOString(), status:'OK', detail:'never executed'};

//application configuration, use the CLI args, the env variables and then, if nothing was found, the default values
nconf.argv().env();

nconf.defaults({
  port: 5000,
  modelPath: '/mounted/model/model_id1-501-1448236541.t7_cpu.t7',
  processFolder: '/tmp/',
  useGPU: '-1'
});


//check that the model and the processing folder are present
try{
  fs.statSync(nconf.get('modelPath'));
}
catch(e){
  console.error("cannot find model file: "+nconf.get('modelPath')+" is the Docker volume  mounted correctly using the -v option?");
  process.exit(1);
}



try{
  fs.statSync(nconf.get('processFolder'));
}
catch(e){
  console.error("cannot find process folder: "+nconf.get('processFolder'));
  process.exit(1);
}


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
    console.log('neuraltalk2 process exited with code ' + code);
    callback(code);
  });
};


/**
 *Parse the captions and remove the corresponding processed files
 * */
var parseCaptions = function(cb){
  fs.readFile('/neuraltalk2/vis/vis.json', 'utf8',(err, data) => {
    if(err){
      latestOutcome = {timestamp:new Date().toISOString(), status:'error parsing the captions',detail:err};
      return;
    }
    var done = 0;
    JSON.parse(data).forEach(result => {
      fs.unlink(result.file_name);
      var sha256sum = result.file_name.replace(nconf.get('processFolder'),'').split('.')[0].replace('/','');
      console.log("sha256sum "+sha256sum+" => "+result.caption);
      sha256Captions.set(sha256sum,result.caption);
      done++;
    });
    latestOutcome = {timestamp:new Date().toISOString(), status:'OK',processed:done};
  });
};

setInterval(()=>{
  if(pending.length === 0 || isAlreadyRunning){
    return;
  }
  isAlreadyRunning = true;
  pending.forEach((p,i) =>{
    helpers.cp(p.path,nconf.get('processFolder')+'/'+p.sha256sum+'.'+p.path.split('.').slice(-1),err => {
      if(err){
        console.error("error copying file to be processed",err)
          return;
      }
      fs.unlink(p.path);
      console.log("moved file "+i+" of "+pending.length);
      if(i === pending.length -1){
        runNeuralTalk(retCode => {
          //time to parse the captions
          isAlreadyRunning = false;
          pending = [];
          console.log(" +++ return code from neuraltalk2: "+retCode);
          if(retCode !== 0){
            latestOutcome = {timestamp:new Date().toISOString(), status:'failure', retCode:retCode};
            return;
          }
          parseCaptions(()=> {
            isAlreadyRunning = false;
          });
        });
      }

    });
  });

},5000);

app.use(express.static('static'));
app.use(bodyParser.json({limit: '6mb'}));

app.get('/status',(req,res)=>{
  res.json(latestOutcome);
});

app.get('/caption/:sha256sum',function(req,res){

  var key = req.params.sha256sum;
  var value = sha256Captions.get(key);
  if(key.length !== 64){
    res.status(400).json({error:"expecting a sha256 digest, it should be 64 characters long"});
  }
  if(value){
    res.json({caption:value});
    return;
  }

  res.status(404).json({error:"caption not found, it is expired or yet to be processed"});
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
    console.log({path:newpath+'.'+res.extension,sha256sum:res.sha256sum});
    pending.push({path:newpath+'.'+res.extension,sha256sum:res.sha256sum});
    http_res.json(res);
  });
});


//start the server
server.listen(nconf.get('port'), function () {
  var port = server.address().port;
  console.log(' Application started on port', port);
});
