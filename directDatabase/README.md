Database benchmark tool
=======================

This tool is designed to get a benchmark on the ndn catalog database directly.

Requirements/install
--------------------

You must have a file named names.gz in the directory above this one containing
all names you wish to query on in a newline separated gzipped file.

You must copy example-config.json to config.json and configure your own options.

Note: connectionLimit and parallel each can interfere with eachother so it is
recommended to set them to the same value or at least have parallel higher.
At any one time, you will only have the connectionLimit number of connections
to the mysql server and parallel controls how many names are being configured
and possibly waiting on the mysql pool.

The size variables control how many names in the list will be sampled on for
each test.

The components variables controls the min and max number of components that
can show up in a given name for the samples. (0 being only / and 1 being
/something/) If you set them both to the same value, only names of that size
will be included up the the size limit set earlier.

WARNING: Don't set the expectation higher than the inputs can reach, for instance
setting the size variables to 200 and limiting the components to 0 will result
in an infinite loop and you will have to manually stop the benchmark, the
benchmark requires that the size is reached before continuing to the tests and
thus will hang/loop looking for valid names.

Output
------

The output will be two json files containing an array of arrays in the format:
[name, results, time (ns)] for the path completion and auto complete.

