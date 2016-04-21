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

function getRandomLengthNames(names, quantity, config){

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

  return function(path, config, callback){

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

  return function(path, config, callback){

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

const randomQuery = function(names, func, config, callback, progress){

  const begin = process.hrtime(); //The beginning of task time.

  async.mapLimit(Array.from(names), config.parallel, function(path, callback){
    const start = process.hrtime(); //Record high res time
    const startDiff = process.hrtime(begin); //Time of query relative to begin
    const startns = startDiff[0] * 1e9 + startDiff[1];

    func(path, config, function(results, packets, first, end){

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

      const roundCount = config.rounds.length;

      console.log("Running...");

      async.forEachOfSeries(config.rounds, function(roundConfig, round, callback){

        const conf = Object.assign({}, config.defaults, roundConfig);

        async.timesSeries(roundConfig.repeat || 1, function(n, next){

          console.log("Round: " + (round+1) + "/" + roundCount + "  Cycle: " + (n+1) + "/" + roundConfig.repeat);

          async.series([
              function(callback){

                randomQuery(
                    getRandomLengthNames(names, conf.autoCompleteSize, conf),
                    autoComplete,
                    conf,
                    function(results){
                      callback(null, results);
                    }
                    );
              },
              function(callback){

                randomQuery(
                    getRandomLengthNames(names, conf.pathCompleteSize, conf),
                    pathQuery,
                    conf,
                    function(results){
                      callback(null, results);
                    }
                    );
              }], function(err, results){
                if (err){
                  return console.error(err);
                }
                next(null, results);
              });
        }, function(err, results){
          handleResults(results, (conf.log || "output") + (round + 1), conf);
          callback(err);
        });
      
      }, callback);

    }
  ], function (err, results){
    face.close();
    if (err){
      return console.error(err);
    }
  });

};

function handleResults(results, name, config){

  console.log(results);

  //Print autocomplete results.
  var csv = "iteration,startTime(ns),firstpacket rtt(ns),time till last packet (ns),results,packets,name\n";

  //Results kept getting wrapped in an array, unwrap and convert to csv.
  results[0].forEach(function(iteration, count){
    iteration.forEach(function(result){
      csv += (count + 1) + ',' + result.join(',') + "\n";
    });
  });

  fs.writeFile(
      name + "_ac.csv", //filename
      csv, //data
      {encoding: 'utf8'}, //options
      function(err){ //callback
        if (err){
          return console.error(err);
        }
        console.log("Printed to " + name + "_ac.csv");
      });

  //Print pathcomplete results.
  csv = "iteration,startTime(ns),firstpacket rtt(ns),time till last packet (ns),results,packets,name\n";

  results[1].forEach(function(iteration, count){
    iteration.forEach(function(result){
      csv += (count + 1) + ',' + result.join(',') + "\n";
    });
  });

  fs.writeFile(
      name + "_pq.csv", //filename
      csv,
      {encoding: 'utf8'},
      function(err){
        if (err){
          return console.error(err);
        }
        console.log("Printed to " + name + "_pq.csv");
      });

}

if (require.main === module){
  main();
}

