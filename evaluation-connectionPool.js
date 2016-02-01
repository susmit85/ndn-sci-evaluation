/** NDN-Atmos: Cataloging Service for distributed data originally developed
 *  for atmospheric science data
 *  Copyright (C) 2015 Colorado State University
 *
 *  NDN-Atmos is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  NDN-Atmos is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with NDN-Atmos.  If not, see <http://www.gnu.org/licenses/>.
**/

"use strict";
var ndn = require("./ndn-js");
var fs = require("fs");
var argv = require('minimist')(process.argv.slice(2));;

function RetrieveData(pipeline){
  this.pipelineSize = pipeline;
  this.dataReceived = 0;
  this.timeoutDict = {};
  this.dataDict = {};

  console.log("============ PipelineSize = " + this.pipelineSize + "=========");

  this.face = new ndn.Face({host: "localhost", port: "6363"});

  for (var i = 0; i < this.pipelineSize; i++) {
    var outgoingInterestName = new ndn.Name("/catalog/").append("query");

    var filters = {
      "product" : i
    };

    var jsonString = JSON.stringify(filters);
    outgoingInterestName.append(jsonString);

    var tmp = [];
    var hrstart = process.hrtime();

    tmp.push(hrstart[0]*10e9 + hrstart[1]);
    var queryParam = outgoingInterestName.get(2).toEscapedString();
    this.dataDict[queryParam] = tmp;
    var outgoingInterest = new ndn.Interest(outgoingInterestName);
    outgoingInterest.setInterestLifetimeMilliseconds(10000);
    outgoingInterest.setMustBeFresh(true);

    this.face.expressInterest(outgoingInterest, this.onData.bind(this),
                              this.onTimeout.bind(this));
  }
}


RetrieveData.prototype.onData = function(interest, data) {
  var queryParam = data.getName().get(2).toEscapedString();
  var hrend = process.hrtime();

  this.dataDict[queryParam].push(hrend[0]*10e9 + hrend[1]);
  this.dataReceived++;
  if (this.dataReceived === this.pipelineSize) {
    this.face.close();
    this.collectResults();
  }
};

RetrieveData.prototype.onTimeout = function(interest) {
  this.dataReceived++;
  var queryParam;
  queryParam = interest.getName().get(2).toEscapedString();

  this.dataDict[queryParam].push("undefined");
  if (this.dataReceived === this.pipelineSize) {
    this.face.close();
    this.collectResults();
  }
};

RetrieveData.prototype.collectResults = function() {
  for (var key in this.dataDict) {
    if (this.dataDict[key][1] != "undefined") {
      console.log(key, this.dataDict[key][1], this.dataDict[key][0], this.dataDict[key][1] - this.dataDict[key][0]);
    } else { // only print out the start and the end 
      console.log("timeout: ", key , this.dataDict[key]);
    }
  }
}

var main = function(pipeline){
  var run = new RetrieveData(pipeline);
};

if (require.main === module) {
  if (argv._.length != 1) {
    console.log("node <this-program> <pipeline-num>");
    return;
  }
  console.log("starting experiments using pipeline:", argv._[0]);
  main(argv._[0]);
};
