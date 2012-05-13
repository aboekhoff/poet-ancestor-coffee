var f, fs, load, main, p, path, t, util;
fs = require('fs');
path = require('path');
util = require('util');
p = function(x) {
  return console.log(util.inspect(x, false, null));
};
t = true;
f = false;
load = function(filename) {
  var rdr, src;
  src = fs.readFileSync(filename, 'utf8');
  rdr = Reader.create(src, filename);
  return loadToplevel(rdr);
};
$LOAD(load);
main = function() {
  var i, _results;
  $PACKAGE(Package.createStandardPackage("user"));
  $LOAD();
  i = 2;
  _results = [];
  while (i < process.argv.length) {
    load(process.argv[i]);
    _results.push(i++);
  }
  return _results;
};
main();