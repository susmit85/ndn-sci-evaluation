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
const config = require('./config.json');

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
        console.error("Autocomplete timeout: ", interest.getName().toUri(), path, piece - 1);
        //throw new Error("Failed to finish autocomplete.");
        //We skip the name instead but log it to the output.
        callback();
      });

    };

    get(new ndn.Name(name));

  };

})();

const randomPathQuery = (function(){

  //Borrowed from stack exchange! (Not our code)
  const shuffle = function(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  }

  return function(names, callback){

    var iterations = [];

    const prefix = new ndn.Name((config.prefix || '/cmip5') + '/query');

    const begin = process.hrtime(); //The beginning of task time.

    const iterate = function(list, done, round){
      var dataList = [];
      var maxParallel = Number(config.max_parallel_requests || 100) * (round + 1) * 2;
      iterations.push({
        data: dataList,
        maxParallel: maxParallel
      });

      console.log("Round:", round);

      async.eachLimit(list, maxParallel, function(ele, callback){

        var name = new ndn.Name(prefix);
        name.append(JSON.stringify({'??': ele}));

        const startRequest = process.hrtime(begin); //Time since start of task to start of request
        const start = process.hrtime(); //When the request started

        request(name, function(interest, data){

          const end = process.hrtime(start);

          dataList.push([
              startRequest[0] * 1e9 + startRequest[1],
              end[0] * 1e9 + end[1], //Query time
              ele //name
          ]);

          callback();

        }, function(interest) {

          dataList.push([-1, -1, ele]);

          callback();

        });
      }, done);

    }

    var list = shuffle(names.slice(0));

    if (process.env.npm_package_config_split_data == true){
      let round = 0;
      let size = list.length / Number(config.rounds);
      let repeat = function(){
        if (round >= (Number(config.rounds) || 1) ){
          callback(iterations);
        } else {
          iterate(list.slice(size * round, (size+1) * round), repeat, round);
          round++;
        }
      }
    } else {
      let round = 0;
      let repeat = function(){
        if (round >= (Number(config.rounds) || 1) ){
          callback(iterations);
        } else {
          iterate(list, repeat, round);
          round++;
        }
      }
      repeat();
    }

  }

})();

/**
 * Asynchronous name discovery using autocomplete.
 */
function asyncNameDiscovery(callback){

  var names = [];
  var begin = process.hrtime();

  const getPaths = function(root, callback){

    const start = process.hrtime(); //Record high res time
    const startDiff = process.hrtime(begin); //Time of query relative to begin
    const startns = startDiff[0] * 1e9 + startDiff[1];

    //Path corrections.
    root = root.replace(/\/{2}/g, '/');
    if (!root.endsWith('/')) root += '/';

    autoComplete(root, function(next, lastElement){

      const end = process.hrtime(start); //Time relative to start of query
      const rtt = end[0] * 1e9 + end[1]; //RTT

      if (!next){
        names.push([startns, -1, 0, root]);
        return callback(); //No need to continue
      } else {
        names.push([startns, rtt, next.length, root]);
      }

      if (!lastElement){
        callback(null, next.map(function(item){
          return root + item + '/';
        }));
      } else {
        callback(); //Done.
      }

    });

  }

  const query = function(err, vals){
    if (err){
      throw err;
    }

    if (!vals){
      throw new Error('No results found!');
    }

    //console.log('debug', vals);

    var next = vals.reduce(function(prev, current){ //Vals is an array of arrays, we want to flatten this.
      if (current){
        return prev.concat(current);
      } else {
        return prev;
      }
    }, []);

    if (next.length > 0){
      let parallel = Number(config.max_parallel_autocomplete || 100);
      if (parallel <= 0){
        async.map(next, getPaths, query); //Run getPaths on every value in next, when done run this function.
      } else {
        async.mapLimit(next, parallel, getPaths, query); //Same as above except limited to some number of queries.
      }
    } else {
      callback(names);
    }

  }

  getPaths('/', function(err, next){
    query(err, [next]); //Fix default return since we didn't use map.
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

  console.log("Stage 1: Branching name discovery");

  var data = {};
  asyncNameDiscovery(function(names){
    data.names = names;
    console.log("Stage 2: Random Path Query");
    randomPathQuery(names.map(function(element){
        return element[3];
      }), function(paths){

      data.paths = paths;

      handleResults(data);

    });
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
      process.env.npm_package_config_log || 'output.log', //filename
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


if (require.main === module) {
  main();
}

