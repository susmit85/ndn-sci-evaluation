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

