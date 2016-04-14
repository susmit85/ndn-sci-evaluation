/** NDN-Atmos: Cataloging Service for distributed data originally developed
 *	for atmospheric science data
 *	Copyright (C) 2015 Colorado State University
 *
 *	NDN-Atmos is free software: you can redistribute it and/or modify
 *	it under the terms of the GNU General Public License as published by
 *	the Free Software Foundation, either version 3 of the License, or
 *	(at your option) any later version.
 *
 *	NDN-Atmos is distributed in the hope that it will be useful,
 *	but WITHOUT ANY WARRANTY; without even the implied warranty of
 *	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.	See the
 *	GNU General Public License for more details.
 *
 *	You should have received a copy of the GNU General Public License
 *	along with NDN-Atmos.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";
const ndn = require("ndn-js");
const fs = require("fs");
const os = require('os');
const async = require('async');
const zlib = require('zlib');
const config = require('./config.json');

function getRandom(min, max){
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * This function gets a random length of components.
 */
function getLengthVariation(name, length){
    var regex = new RegExp("(^\\/(?:[\\w\\-]+\\/){" + length + "})");
    var match = regex.exec(name);
    return match[0];
}

function getRandomLengthNames(names, quantity){

    var list = new Set();

    while (list.size < quantity){

        var name = names[getRandom(0, names.length - 1)];
        var variations = [];

        for (let i = config.components.min; i < config.components.max; ++i){
            let variation = getLengthVariation(name, i);
            if (!list.has(variation)){
                variations.push(variation);
            }
        }

        if (variations.length > 0){
            list.add(variations[getRandom(0, variations.length - 1)]);
        }

    }

    return list;

}

var face = null;

function request(name, success, failure){

  var interest = new ndn.Interest(name);
  interest.setInterestLifetimeMilliseconds(Number(config.timeout) || 1000);
  interest.setMustBeFresh(true);

  face.expressInterest(interest, success, failure);
}

const autoComplete = (function(){

  const prefix = new ndn.Name((config.prefix || '/cmip5') + '/query');

  return function(path, callback){

    const name = new ndn.Name(prefix);

    name.append(JSON.stringify({'?':path}));

    var piece = 1; //If we need it, start at one.

    var next = [];

    const begin = process.hrtime(); //When did the first packet go out?
    var first;

    const get = function(name){

      request(name, function(interest, data){
        var content = JSON.parse(data.getContent().toString().replace(/[\n\0]/g, ''));
        next = next.concat(content.next);
        
        if (piece === 1){
          first = process.hrtime(begin); //First packet is back.
        }
        
        if (content.resultCount !== content.viewEnd){
          let n2 = data.getName().getPrefix(-1);
          n2.appendSegment(piece++);
          get(n2);
        } else {
          const end = process.hrtime(begin);

          callback(next, piece, first[0] * 1e9 + first[1], end[0] * 1e9 + end[1]); //data, packet count, first packet time, last packet time
        }

      },
      function(interest){
        console.error("Autocomplete timeout: ", interest.getName().toUri(), path, piece - 1);
        //throw new Error("Failed to finish autocomplete.");
        //We skip the name instead but log it to the output.
        callback();
      });

    };

    get(new ndn.Name(name));

  };

})();

const pathQuery = (function(){

  const prefix = new ndn.Name((config.prefix || '/cmip5') + '/query');

  return function(path, callback){

    const name = new ndn.Name(prefix);

    name.append(JSON.stringify({'??': path}));

    var piece = 1;

    var results = [];

    const begin = process.hrtime();
    var first;

    const get = function(name){

      request(name, function(interest, data){
        var content = JSON.parse(data.getContent().toString().replace(/[\n\0]/g, ''));
        results = results.concat(content.results);
        
        if (piece === 1){
          first = process.hrtime(begin);
        }
        
        if (content.resultCount !== content.viewEnd && config.fullPathQuery === true){
          let n2 = data.getName().getPrefix(-1);
          n2.appendSegment(piece++);
          get(n2);
        } else {
          const end = process.hrtime(begin);

          callback(results, piece, first[0] * 1e9 + first[1], end[0] * 1e9 + end[1]);
        }

      },
      function(interest){
        console.error("Path Query timeout: ", interest.getName().toUri(), path, piece - 1);
        callback();
      });

    };

    get(new ndn.Name(name));

  };

})();

const randomQuery = function(names, func, callback){

  const begin = process.hrtime(); //The beginning of task time.

  console.log("Debug", names);

  async.mapLimit(Array.from(names), config.parallel, function(path, callback){
    const start = process.hrtime(); //Record high res time
    const startDiff = process.hrtime(begin); //Time of query relative to begin
    const startns = startDiff[0] * 1e9 + startDiff[1];

    console.log("Trying:", path);

    func(path, function(results, packets, first, end){

      if (!results){
        callback(null, [startns, -1, -1, 0, 0, path]);
      } else {
        callback(null, [startns, first, end, results.length, packets, path]);
      }

    });

  }, function(err, results){
    if (err){
      return console.error(err);
    }
    callback(results);
  });	

}


function main(pipeline){

  console.log("Setting up");

  var timeout = setTimeout(function(){
    console.error("Face never connected.");
    face.close();
    process.exit(1);
  }, 10000);

  face = new ndn.Face({
    host: config.address|| "atmos-den.es.net",
    port: Number(config.port) || 6363,
    onopen: function(){
      console.log("Connection open.");
      clearTimeout(timeout);
    },
    onclose: function(){
      console.log("Connection closed!");
    }
  });

  async.waterfall([
    function(callback){

      console.log("Retrieving names from file.");

      var buffers = [];

      fs.createReadStream('../names.gz').pipe(zlib.createGunzip())
        .on('data', function(buffer){
          buffers.push(buffer);
        }).on('end', function(){
          var buffer = Buffer.concat(buffers);

          var data = buffer.toString('ascii');
          var names = data.split(/\n/);
          if (names.length === 0) return callback("Not enough names!");
          callback(null, names);
        });

    },
    function(names, callback){

      async.series([
        function(callback){
          console.log("Stage 1: Branching name discovery");

          randomQuery(
              getRandomLengthNames(names, config.autoCompleteSize),
              autoComplete,
              function(results){
                callback(null, results);
              }
            );
        },
        function(callback){

          console.log("Stage 2: Random Path Query");

          randomQuery(
              getRandomLengthNames(names, config.pathCompleteSize),
              pathQuery,
              function(results){
                callback(null, results);
              }
            );
        }], function(err, results){
          if (err){
            return console.error(err);
          }
          callback(null, results);
        });

    }
  ], function (err, results){
    if (err){
      return console.error(err);
    }
    handleResults(results);
  });

};

function handleResults(results){

  face.close();

  console.log("Complete: Writing to log file");

  var log = {
    details: {
      arch: os.arch(),
      cpus: os.cpus(),
      platform: os.platform(),
      release: os.release(),
      load: os.loadavg(),
      type: os.type()
    },
    data: results
  };

  fs.writeFile(
      config.log || 'output.json', //filename
      JSON.stringify(log, null, config.pretty_space || null), //data
      {encoding: 'ascii'}, //options
      function(err){ //callback
        if (err){
          console.error(err);
        } else {
          console.log("Done!");
        }
      }
  );
}

if (require.main === module){
  main();
}

