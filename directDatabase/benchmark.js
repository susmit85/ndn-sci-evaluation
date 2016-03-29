'use strict';
//Config
const config = require('./config.json');

//Includes
const mysql = require('mysql');
const zlib = require('zlib');
const fs = require('fs');

//Globals
const connection = mysql.createConnection(config.mysql);
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

  console.log(quantity, list.size);

  while (list.size < quantity){

    var name = names[getRandom(0, names.length - 1)];
    var variations = [];

    for (let i = 0; i < 8; ++i){
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

  console.log('# of names:', names.length);
  //Tests

  //TODO Path queries


  //Autocomplete queries
  var list = getRandomLengthNames(names, config.autoCompleteSize);

  console.log("List of names:", list);

}).catch(function(e){
  console.error(e);
});


