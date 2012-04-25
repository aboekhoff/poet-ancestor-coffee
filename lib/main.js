var f, fs, main, p, path, t, util;
fs = require('fs');
path = require('path');
util = require('util');
p = function(x) {
  return console.log(util.inspect(x, false, null));
};
t = true;
f = false;
main = function() {
  var file, i, rdr, src, _results;
  $PACKAGE(Package.createStandardPackage("user"));
  i = 2;
  _results = [];
  while (i < process.argv.length) {
    file = process.argv[i];
    console.log('loading ' + file);
    src = fs.readFileSync(process.argv[i], 'utf8');
    rdr = Reader.create(src, file);
    loadToplevel(rdr);
    _results.push(i++);
  }
  return _results;
};
main();