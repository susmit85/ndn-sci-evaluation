const fs = require('fs');

var csv = "startTime (ns),rtt (ns of first packet),total time (ns of all packets),# of results,# of packets,name\n";

const data = require('./output.json');

data.data[0].forEach(function(row){
  csv += row.join(',') + "\n";
});

fs.writeFile('autoComplete.csv', csv, function(err){
  if (err){
    throw err;
  }
});

var csv2 = "startTime (ns),rtt (ns of first packet),total time (ns of all packets),# of results,# of packets,name\n";

data.data[1].forEach(function(row){
  csv2 += row.join(',') + "\n";
});

fs.writeFile('pathQuery.csv', csv2, function(err){
  if (err){
    throw err;
  }
});

