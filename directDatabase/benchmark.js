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

new Promise(function(resolve, reject){

  var buffers = [];

  fs.createReadStream('../names.gz').pipe(zlib.createGunzip())
    .on('data', function(buffer){
      buffers.push(buffer);
    }).on('end', function(){
      var buffer = Buffer.concat(buffers);

      var data = buffer.toString('ascii');
      var names = data.split(/\n/);
      resolve(names);
    });

}).then(function(names){

  //Tests
  var list;

  //Path queries
  list = getRandomLengthNames(names, config.pathCompleteSize);
  
  const q = 'SELECT `name` FROM testdb.' + config.table + ' WHERE';
  const slash = /^\/|\/$/g;

  console.log("Starting path queries");

  async.mapLimit(list, config.parallel, function(item, callback){

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

    console.log("Finished with all path queries");

    const csv = results.reduce(function(previous, next){
      return previous + next.join(',') + "\n";
    }, "Path query,results,database time,network time\n");

    fs.writeFile('pathComplete.csv', csv, function(err){
      if (err){
        return console.error(err);
      }

      console.log("Wrote results to pathComplete.csv");
    });

    //Autocomplete queries
    list = getRandomLengthNames(names, config.autoCompleteSize);
    
    const q = 'SELECT DISTINCT $val FROM testdb.' + config.table + ' WHERE';

    async.mapLimit(list, config.parallel, function(item, callback){

      console.log("Running on:", item);

      var w = '';

      var components = item.replace(slash, '').split(/\//);
      components.forEach(function(value, index){
        if (index > 0) w += ' AND';
        w += ' `' + schema[index] + "` = '" + value + "'";
      });

      pool.getConnection(function(err, connection){

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

      console.log("Finished with all auto complete queries.");

      const csv = results.reduce(function(prev, next){
        return prev + next.join(',') + "\n";
      }, "name,results,database time,network time\n");

      fs.writeFile('autoComplete.csv', csv, function(err){
        if (err){
          return console.error(err);
        }
        console.log("Wrote results to autoComplete.csv");
      });

      pool.end(function(err){
        if (err){
          return console.error(err);
        }
        console.log("Done!");
      });

    });

  });


}).catch(function(e){
  console.error(e);
});

