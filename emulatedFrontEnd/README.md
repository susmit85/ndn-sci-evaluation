NDN-Sci-Benchmark
=================

Usage:
------
Simply run `npm start` or `node benchmark.js` in this directory.

All configuration options are in example-config.json

Setup:
------

Setup is easy, you simply run `npm install` inside the package directory (Same one this readme is in).

Now copy the example config to a file called config.json and modify the values to suit your needs.

Config Options
--------------

* rounds - A list of experiments. Add any number of additional options here such as max parallel or the number of names.
* parallel - Sets a cap on the max number of parallel queries, both path and autocomplete.
* repeat - How many times you want to shorten the names (valid: 1-9)
* Port - Port number of ndn server
* Address - Address of ndn server
* timeout - The max timeout before a name is considered missing or invalid

