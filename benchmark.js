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
  interest.setInterestLifetimeMilliseconds(process.env.npm_package_config_timeout || 1000);
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
          let n2 = data.getName().getPrefix(-1);
          n2.appendSegment(piece++);
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

const randomPathQuery = (function(){

  const shuffle = function(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  }

  return function(names, callback){

    var dataList = {};

    names.forEach(function(value){
      dataList[value] = [];
    });

    const prefix = new ndn.Name((process.env.npm_package_config_prefix || '/cmip5') + '/query');

    async.times(process.env.npm_package_config_rounds || 5, function(n, next){

      console.log("Iteration:", n);

      var list = shuffle(names.slice(0));

      async.eachLimit(list,
          process.env.npm_package_config_max_parallel_requests || 100,
          function(ele, callback){

            var name = new ndn.Name(prefix);
            name.append(JSON.stringify({'??': ele}));

            var start = process.hrtime();

            request(name, function(interest, data){

              var end = process.hrtime(start);

              dataList[ele].push(end[0] * 1e9 + end[1]);

              callback();

            }, function(interest) {

              dataList[ele].push(-1);

              callback();

            });
          },
          function(){
            next(); //Start the next iteration.
          }
               );

    }, function(err){
      callback(dataList);
    });

  }

})();

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

  var data = {};
  asyncNameDiscovery(function(names){
    data.names = names;
    console.log("Stage 2: Random Path Query");
    randomPathQuery(Object.keys(names), function(paths){

      data.paths = paths;

      handleResults(data);

    });
  });
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

