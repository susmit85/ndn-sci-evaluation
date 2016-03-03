"use strict";

//skip the ? and get all the parameters.
var params = window.location.search.substring(1).split('&').reduce(function(data, element){
  var a = element.split('=');
  data[a[0].toLowerCase()] = a[1];
  return data;
}, {});

var p1 = new Promise(function(resolve, reject){
  var ajax = new XMLHttpRequest();
  ajax.onreadystatechange = function(){
    if (ajax.readyState === 4){
      if (ajax.status === 200){
        resolve(JSON.parse(ajax.responseText));
      } else {
        reject();
      }
    }
  }
  ajax.open('GET', params['data']);
  ajax.send();
});

var p2 = new Promise(function(resolve, reject){
  window.addEventListener('load', function(){
    console.log("Ready");
    resolve();
  });
});

var p3 = new Promise(function(resolve, reject){
  google.charts.load('44', {packages: ['corechart']});
  google.charts.setOnLoadCallback(resolve);
});

Promise.all([p1, p2, p3])
  .then(function(values){
    var data = values[0].data;

    switch ((params['type'] || '').toLowerCase()){
      case "names": 
        names(data.names);
        break;
      case "boxpaths":
        boxPaths(data.paths);
        break;
      default:
      case "paths":
        paths(data.paths);
        break;
    }

  });

function names(data){

  var table = new google.visualization.DataTable();
  table.addColumn('number', 'Time Elapsed (ms)');
  table.addColumn('number', 'Query delay (ms)');
  table.addColumn({type:'string', role:'tooltip'});

  table.addRows(data.map(function(element){
    return [element[0] / 1e6, element[1] / 1e6, "Name: " + element[3] + ", Active queries: " + element[2]];
  }));

  var options = {
    title: 'Branching name queries',
    hAxis: {title: 'Time Elapsed (ms)'},
    vAxis: {title: 'Query delay (ms)'}
  };

  var chart = new google.visualization.ScatterChart(document.getElementById('chart'));
  chart.draw(table, options);

}

function paths(data){

  var table = new google.visualization.DataTable();

  table.addColumn('number', 'Time Elapsed (ms)');
  table.addColumn('number', 'Query delay (ms)');

  for (let iteration = 0; iteration < data.length; ++iteration){
    data[iteration].forEach(function(element){
      table.addRow([element[0] / 1e6, element[1] / 1e6]);
    });
  }

  var options = {
    title: 'Random Path Query',
    hAxis: {title: 'Time Elapsed (ms)'},
    vAxis: {title: 'Query delay (ms)'}
  };

  var chart = new google.visualization.ScatterChart(document.getElementById('chart'));
  chart.draw(table, options);

}

function average(data, subIndex){
  var sum = data.reduce(function(prev, current){
    prev += current;
    return prev;
  }, 0);
  var avg = sum / data.length;
  return avg;
}

function boxPaths(data){

  var table = google.visualization.arrayToDataTable(
    data.map(function(iteration, index){
      var d = iteration.reduce(function(prev, value, index, array){ //Remove time as a factor
        if (index + 1 === array.length) return prev;
        prev.push(Math.abs(array[index + 1][1] / 1e6 - value[1] / 1e6));
        return prev;
      }, []);
      var avg = average(d); //Get the average.
      var diffsq = d.map(function(value){
        return Math.pow(value - avg, 2);
      });
      var avgDiffsq = average(diffsq);
      var stdDev = Math.sqrt(avgDiffsq);

      var min = Math.min.apply(null, d);
      var max = Math.max.apply(null, d);


      console.log("Iteration %i, avg %f, stdDev %f, min %f, max %f", index, avg, stdDev, min, max);

      return ["Iteration: " + index, min, avg - stdDev, avg + stdDev, max];

    }), true);

  var options = {
    legend: 'none',
    title: 'Random Path Query Statistics',
    hAxis: {title: 'Iteration'},
    vAxis: {title: 'Query delay (ms)'}
  };

  var chart = new google.visualization.CandlestickChart(document.getElementById('chart'));
  chart.draw(table, options);

}
