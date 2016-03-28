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
  table.addColumn({type:'string', role:'tooltip'});

  for (let iteration = 0; iteration < data.length; ++iteration){
    data[iteration].data.forEach(function(element){
      table.addRow([element[0] / 1e6, element[1] / 1e6, "Name: " + element[2] + " Parallel Queries: " + data[iteration].maxParallel]);
    });
  }

  var options = {
    title: 'Random Path Query',
    hAxis: {title: 'Time Elapsed (ms)'},
    vAxis: {title: 'Query delay (ms)'},
    explorer: { actions: ['dragToZoom', 'rightClickToReset']}
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

  var stats = data.map(function(iteration, index){
    var d = iteration.data.reduce(function(prev, value, index, array){ //Remove time as a factor
      prev.push(value[1] / 1e6);
      return prev;
    }, []).sort(function(a, b){ return a - b; });
    var avg = average(d); //Get the average.
    var diffsq = d.map(function(value){
      return Math.pow(value - avg, 2);
    });
    var avgDiffsq = average(diffsq);
    var stdDev = Math.sqrt(avgDiffsq);

    var min = Math.min.apply(null, d);
    var max = Math.max.apply(null, d);

    var median = 0;
    if (d.length % 2 == 0){
      let si = d.length / 2;
      median = average([d[si - 1], d[si]]);
    } else {
      let si = Math.floor(d.length / 2);
      median = d[si];
    }

    return [iteration.maxParallel, min, avg + stdDev, avg - stdDev, max, avg, median];
  });

  stats.unshift(['Max parallel queries', 'Min/Max/StdDev', '', '', '', 'Avg', 'Median']);

  var table = google.visualization.arrayToDataTable(stats);

  var options = {
    title: 'Random Path Query Statistics',
    hAxis: {title: 'Maximum Parallel Queries'},
    vAxis: {title: 'Query RTT (ms)'},
    series: {0: {type: "candlesticks"}, 1: {type: "line", pointSize: 10, lineWidth: 0}, 2: {type: "line", pointSize: 10, lineWidth: 0, color: 'black'}}
  };

  var chart = new google.visualization.ComboChart(document.getElementById('chart'));
  chart.draw(table, options);

}
