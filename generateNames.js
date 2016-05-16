"use strict";

const async = require('async');
const fs = require('fs');
const zlib = require('zlib');

function getRandom(min, max){
  return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomNames(names, quantity){

  var list = new Set();

  while (list.size < quantity){

    var name = names[getRandom(0, names.length - 1)];

    if (!list.has(name)){
      list.add(name);
    }

  }

  return Array.from(list);

}


async.waterfall([
    function(callback){
      var buffers = [];

      fs.createReadStream('names.gz').pipe(zlib.createGunzip())
        .on('data', function(buffer){
          buffers.push(buffer);
        }).on('end', function(){
          var buffer = Buffer.concat(buffers);

          var data = buffer.toString('ascii');
          var names = data.split(/\n/);
          callback(null, names);
        });

    }, function(names, callback){
      callback(null, getRandomNames(names, process.argv[2]));
    }], function(err, results){

      if (err){
        return console.error(err);
      }

      fs.writeFile('names.json', JSON.stringify(results), function(err){
        if (err){
          return console.error(err);
        }
        console.log("Wrote names to names.json");
      });

    });

