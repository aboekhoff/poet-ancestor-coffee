fs   = require('fs')
path = require('path')
util = require('util')

p = (x) -> console.log(util.inspect(x, false, null))

t = true
f = false

load = (filename) ->
  src = fs.readFileSync(filename, 'utf8')
  rdr = Reader.create(src, filename)
  loadToplevel(rdr)

$LOAD(load)

main = () ->
  $PACKAGE(Package.createStandardPackage("user"))
  $LOAD()
  i = 2
  while i < process.argv.length
    load(process.argv[i])
    i++

main()
