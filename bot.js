#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    Twit = require('twit'),
    config = require(path.join(__dirname, 'config.js'));

//var TrainWorldII = require('./script');

var T = new Twit(config);

const child_process = require('child_process');
child_process.spawn('./go.sh', [], {}).on('close', function() {
  T.postMediaChunked({ file_path: 'design.png' }, function (err, data, response) {
    //console.log(data);
    var media_id = data.media_id_string;
    var alt_text = "A design of random hexagonal curves.";
    var meta_params = { media_id: media_id, alt_text: { text: alt_text } };

    T.post('media/metadata/create', meta_params, function (err, data, response) {
      if (!err) {
        var params = { status: 'a design!', media_ids: [media_id] };

        T.post('statuses/update', params, function (err, data, response) {
          //console.log(data);
        });
      }
    });
  });
});

