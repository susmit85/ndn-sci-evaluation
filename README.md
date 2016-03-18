NDN-Sci-Benchmark
=================

Usage:
------
Simply run `npm start` in this directory.

NOTE: Running with `node benchmark.js` will run everything with its own defaults, not the ones set in the config or environment.

To configure the settings, either modify the package.json config section or by using npm config:

```
npm config set ndn-sci-benchmark:port 80
```

Aka: `npm config set <package-name>[@<version>]:<key> <value>`

Setup:
------

Setup is easy, you simply run `npm install` inside the package directory (Same one this readme is in).

Chart:
------

The included chart parses and displays the data. To use it, you must run a local http server. Either
use python or node for this task.

To install a simple node http server simply run `npm install -g http-server` then `http-server` in
this directory. The chart will be available by default at http://localhost:8080.

Config Options
--------------

* Split Data - Instructs the benchmark to shuffle and split the data up into equal parts equal in number to the number of iterations.
* rounds - The number of iterations to run on the catalog.
* Max parallel requests - Limits the benchmark to this many requests at any given time. (Not including the name discovery)
* Max parallel autocomplete - Limits the max number of parallel auto complete queries (Set to 0 for unlimited)
* Log - Output filename
* Pretty Space - Control the character(s) used for indentation in the json file. Usually \t or spaces. (Empty for no indentation)
* Port - Port number of ndn server
* Address - Address of ndn server
* timeout - The max timeout before a name is considered missing or invalid

