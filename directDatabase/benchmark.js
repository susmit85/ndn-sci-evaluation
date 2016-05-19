'use strict';
//Config
const config = require('./config.json');

//Includes
const mysql = require('mysql');
const zlib = require('zlib');
const fs = require('fs');
const async = require('async');

//Globals
const pool = mysql.createPool(config.mysql);
const schema = ['activity', 'product', 'organization', 'model', 'experiment', 'frequency',
    'modeling_realm', 'variable_name', 'ensemble', 'time'];

/**
 * This function shortens ndn names by one component at a time.
 */
const shortenName = (function(){
  const regex = /[\w\d-]+\/$/gm;
  return function(name){
    return name.replace(regex,'');
  }
})();

function shortenNames(names){

  var ret = new Set();

  names.map(function(name){
    var s = shortenName(name);
    if (!ret.has(s)){
      ret.add(s);
    }
  });

  return Array.from(ret);

}

function autoComplete(names, config, callback){
  //Autocomplete queries

  console.log(names.length, config, callback);

  const q = 'SELECT DISTINCT $val FROM testdb.' + config.table + ' WHERE';
  const slash = /^\/|\/$/g;

  async.timesSeries(config.repeat || 1, function(n, next){

    names = shortenNames(names);

    async.mapLimit(names, config.parallel, function(item, callback){

      console.log("Running on:", item);

      var w = '';

      var components = item.replace(slash, '').split(/\//);
      components.forEach(function(value, index){
        if (index > 0) w += ' AND';
        w += ' `' + schema[index] + "` = '" + value + "'";
      });

      pool.getConnection(function(err, connection){

        if (err){
          return console.error(err);
        }

        const qbegin = process.hrtime();
        var first;
        var count = 0;

        connection.query(q.replace('$val', schema[components.length]) + w)
          .on('error', function(err){
            console.error(err);
            connection.release();
          }).on('fields', function(fields){
            first = process.hrtime(qbegin);
            //console.log(fields);
          }).on('result', function(row){
            count++;
          }).on('end', function(){

            connection.release();

            var time = process.hrtime(qbegin);

            callback(null, [item, count, first[0] * 1e9 + first[1], time[0] * 1e9 + time[1]]);

          });
      });

    }, function(err, results){
      console.log("Finished an iteration...");
      next(null, results);
    });
  }, callback);
}

function pathQuery(names, config, callback){
  //Path queries

  const q = 'SELECT `name` FROM testdb.' + config.table + ' WHERE';
  const slash = /^\/|\/$/g;

  console.log("Starting path queries");

  async.timesSeries(config.repeat || 1, function(n, next){

    names = shortenNames(names);

    async.mapLimit(names, config.parallel, function(item, callback){

      console.log("Running on:", item);

      var w = '';

      var components = item.replace(slash, '').split(/\//);
      components.forEach(function(value, index){
        if (index > 0) w += ' AND';
        w += ' `' + schema[index] + "` = '" + value + "'";
      });

      pool.getConnection(function(err, connection){

        if (err){
          console.error(err);
          return;
        }

        const qbegin = process.hrtime();
        var first;
        var count = 0;

        connection.query(q + w)
          .on('error', function(err){
            console.error(err);
            connection.release();
          }).on('fields', function(fields){
            first = process.hrtime(qbegin);
            //console.log(fields);
          }).on('result', function(row){
            count++;
          }).on('end', function(){
            connection.release();
            var time = process.hrtime(qbegin);
            callback(null, [item, count, first[0] * 1e9 + first[1], time[0] * 1e9 + time[1]]);
          });

      });

    }, function(err, results){
      console.log("Finished an iteration...");
      next(null, results);
    });
  }, callback);

}

async.waterfall([
    function(callback){
      var buffers = [];

      fs.readFile('../names.json',{encoding:'utf8'}, function(err, data){
        callback(null, JSON.parse(data));
      });

    },
    function(names, callback){

      var roundResults = [];

      //Tests
      async.forEachOfSeries(config.rounds, function(roundConfig, round, callback){

        const conf = Object.assign({}, config.defaults, roundConfig);

        console.log("Round: " + (round+1) + "/" + config.rounds.length);

        async.series([function(callback){
          autoComplete(names, conf, callback);
        }, function(callback){
          pathQuery(names, conf, callback);
        }], function(err, results){
          console.log("Finished a round...");
          roundResults.push(results);
          callback(err);
        });

      }, function(err){
        console.log("Finished all rounds...");
        callback(err, roundResults);
      });


    }
], function(err, results){

  pool.end(function(err){
    if (err){
      return console.error(err);
    }
    console.log("Done!");
  });

  if (err){
    return console.error(err);
  }

  var csv = "Round,Action,Name Length,Name,Results,Database time,Network Time\n";

  results.forEach(function(data, round){

    data.forEach(function(test, index){

      var t = index === 0 ? 'AutoComplete' : 'PathQuery';

      test.forEach(function(row, count){

        row.forEach(function(value){
          csv += (round + 1) + ',' + t + ',' + (9 - count) + ',' + value.join(',') + '\n';
        });

      });

    });

  });

  fs.writeFile('output.csv', csv, function(err){
    if (err){
      console.error(err);
    }
  });

});

