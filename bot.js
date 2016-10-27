#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    Twit = require('twit'),
    config = require(path.join(__dirname, 'config.js'));
const child_process = require('child_process');
const strftime = require('strftime');

//var TrainWorldII = require('./script');

var T = new Twit(config);
process.env['PATTERNLING_OUTPUT_REPO_PATH'] = config.patternling_output_repo_path

nowstr = strftime.utc()('%Y-%m-%d-%H%M%S%L')
//nowstr = strftime.utc()('%Y-%m-%d-%H%M%S%N')


child_process.spawn('./generate-design.sh', [nowstr], {stdio:['ignore',1,2]}).on('close', function(code) {
  if(code !== 0) { console.log("generate-design failed"); return; }
  child_process.spawn('./commit-design.sh', [nowstr], {stdio:['ignore',1,2]}).on('close', function(code) {
    if(code !== 0) { console.log("commit-design failed"); return; }
    console.log(nowstr);
    T.postMediaChunked({ file_path: 'design.png' }, function (err, data, response) {
      //console.log(data);
      var media_id = data.media_id_string;
      var alt_text = "A design of random hexagonal curves.";
      var meta_params = { media_id: media_id, alt_text: { text: alt_text } };

      T.post('media/metadata/create', meta_params, function (err, data, response) {
        if (!err) {
          var params = {
            status: 'a design! (SVG: https://github.com/idupree/patternling-output/tree/master/v1/'+nowstr+' )',
            media_ids: [media_id] };

          T.post('statuses/update', params, function (err, data, response) {
            console.log(data.id_str, nowstr);
            child_process.spawn('./commit-twitter-link.sh', [nowstr,
                'https://twitter.com/patternling/status/'+data.id_str], {stdio:['ignore',1,2]}
                ).on('close', function(code) {
              if(code !== 0) { console.log("commit-twitter-link failed"); return; }
            });
          });
        }
      });
    });
  });
});

