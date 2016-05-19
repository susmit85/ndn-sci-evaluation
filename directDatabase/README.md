Database benchmark tool
=======================

This tool is designed to get a benchmark on the ndn catalog database directly.

Requirements/install
--------------------

You must have a file named names.gz in the directory above this one containing
all names you wish to query on in a newline separated gzipped file.

You must copy example-config.json to config.json and configure your own options.

Options
-------
* Repeat - Specify how many times to shorten the names. (Valid values: 1-9)
* Parallel - Specify how many parallel queries are allowed to run at any given time.
* Table - Specify which table you want to run the tests on.

Output
------

The output will be two json files containing an array of arrays in the format:
[name, results, time (ns)] for the path completion and auto complete.

