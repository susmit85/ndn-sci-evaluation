const fs = require('fs');

var csv = "startTime (ns),rtt (ns),# of results,name\n";

const data = require('./output.json');

data.data.names.forEach(function(row){
  csv += row.join(',') + "\n";
});

fs.writeFile('output.csv', csv, function(err){
  if (err){
    throw err;
  }
});
