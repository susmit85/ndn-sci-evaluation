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
var ndn = require("ndn-js");
var fs = require("fs");
var os = require('os');
var async = require('async');

var face = null;

ndn.LOG = 3;

function request(name, success, failure){

  var interest = new ndn.Interest(name);
  interest.setInterestLifetimeMilliseconds(process.env.npm_package_config_timeout || 10000);
  interest.setMustBeFresh(true);

  face.expressInterest(interest, success, failure);
}

function getValidNames(callback){

  var dataList = [];

  const prefix = new ndn.Name((process.env.npm_package_config_prefix || '/cmip5') + '/query');

  let name = new ndn.Name(prefix);
  name.append(JSON.stringify({'??': '/'}));

  request(name, function(interest, data){

    var name = data.getName().getPrefix(-1);
    var piece = 0;
    const getPiece = function(interest, data) {

      if (data){
        let content = JSON.parse(data.getContent().toString().replace(/[\n\0]/g,""));
        dataList = dataList.concat(content.results);

        if (dataList.length === content.resultCount){
          console.log("Max requests was not reached, not enough data. (", dataList.length, " names). Using available data instead.");
        }
      }

      if (dataList.length < (process.env.npm_package_config_max_requests || 1000)){
        let pieceName = new ndn.Name(name).appendSegment(piece++);
        request(pieceName, getPiece, function(interest){
          console.error("Failed to get", interest.getName().toUri());
          throw new Error("Connection timed out while retrieving valid names. Consider extending the timeout in the config or environment");
        });
      } else {
        callback(dataList);
      }
    }

    getPiece();

  }, function(interest) {
    console.error("Failed to get", interest.getName().toUri());
    throw new Error("Failed to get valid names for benchmark!");
  });

}

function highlyConcurrentRequests(names, callback){

  /** @type {Object<string, Number>} */
  var timings = {};

  var start = process.hrtime(); //Total time

  async.eachLimit(names, //Data
      process.env.npm_package_config_max_parallel_requests || 50, //psuedo threads
      function(name, callback){ //task
        var time = process.hrtime(); //Per request time
        request(name,
            function(interest, data){ //Success
              var diff = process.hrtime(time);
              timings[name] = diff[0] * 1e9 + diff[1];
              callback();
            },
            function(interest){ //Timeout
              timings[name] = null;
              callback();
            }
               );
      },
      function(err){ //when its all done
        if (err){
          console.error(err);
        } else {
          var total = process.hrtime(start);
          callback({names:timings, totalTime: total[0] * 1e9 + total[1]});
        }
      }
  );

}

function main(pipeline){

  console.log("Setting up");

  var timeout = setTimeout(function(){
    console.error("Face never connected.");
    face.close();
    process.exit(1);
  }, 10000);

  face = new ndn.Face({
    host: process.env.npm_package_config_address|| "atmos-den.es.net",
    port: process.env.npm_package_config_port || 6363,
    onopen: function(){
      console.log("Connection open.");	
      clearTimeout(timeout);
    },
    onclose: function(){
      console.log("Connection closed!");
    }
  });	

  console.log("Stage 1: Discovering valid data names");
  getValidNames(function(names){
    console.log("Stage 2: Highly concurrent requests benchmark");
    highlyConcurrentRequests(names, handleResults);
  });
  
};

function handleResults(results){

  face.close();

  console.log("Stage 3: Writing to log file");

  var log = {
    arch: os.arch(),
    cpus: os.cpus(),
    platform: os.platform(),
    release: os.release(),
    load: os.loadavg(),
    type: os.type(),
    data: results
  };

  fs.writeFile(
      process.env.npm_package_config_log || 'output.log', //filename
      JSON.stringify(log), //data
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


if (require.main === module) {
  main();
} else {
  module.exports = {
    recursiveAutoComplete: recursiveAutoComplete
  };
}

