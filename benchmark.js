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

var face = null;

function request(name, success, failure){

  var interest = new ndn.Interest(name);
  interest.setInterestLifetimeMilliseconds(process.env.npm_package_config_timeout || 5000);
  interest.setMustBeFresh(true);

  face.expressInterest(interest, success, failure);
}

const autoComplete = (function(){

  const prefix = new ndn.Name((process.env.npm_package_config_prefix || '/cmip5') + '/query');

  return function(path, callback){

    const name = new ndn.Name(prefix);

    //Path corrections.
    path = path.replace(/\/{2}/g, '/');
    if (!path.endsWith('/')) path += '/';

    name.append(JSON.stringify({'?':path}));

    var piece = 1; //If we need it, start at one.

    var next = [];

    const get = function(name){

      request(name, function(interest, data){
        var content = JSON.parse(data.getContent().toString().replace(/[\n\0]/g, ''));
        next = next.concat(content.next);

        if (content.resultCount !== content.viewEnd){
          let n2 = new ndn.Name(name);
          n2.appendSegment(piece++);
          console.log("Getting:", n2.toUri());
          console.log(data.getName().toUri());
          console.log(content)
          get(n2);
        } else {
          callback(next, content.lastComponent === true);
        }

      },
      function(interest){
        console.error("Failed to retrieve:", interest.getName().toUri(), path);
        throw new Error("Failed to finish autocomplete.");
      });

    };

    get(new ndn.Name(name));


  };

})();

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

/**
 * Asynchronous name discovery using autocomplete.
 */
function asyncNameDiscovery(callback){

  var names = {};
  var active = 0;

  const getPaths = function(root){

    ++active;

    const start = process.hrtime();

    autoComplete(root, function(next, lastElement){
      --active;

      console.log(active);

      const end = process.hrtime(start);
      const time = end[0] * 1e9 + end[1];
      names[root] = time;

      if (!lastElement){
        next.forEach(function(name){
          getPaths(root + '/' + name);
        });
      } else if (active === 0){
        console.log("Checkpoint 1");
        callback(names);
      }

    });

  }

  getPaths('/');

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

  //console.log("Stage 1: Discovering valid data names");
  //getValidNames(function(names){
  console.log("Stage 1: Branching name discovery");
  asyncNameDiscovery(handleResults);
  //});

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

