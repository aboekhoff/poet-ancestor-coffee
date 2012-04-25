fs   = require('fs')
path = require('path')
util = require('util')

p = (x) -> console.log(util.inspect(x, false, null))

t = true
f = false

main = () ->
  $PACKAGE(Package.createStandardPackage("user"))
  i = 2
  while i < process.argv.length
    file = process.argv[i]
    console.log('loading ' + file)
    src = fs.readFileSync(process.argv[i], 'utf8')
    rdr = Reader.create(src, file)
    loadToplevel(rdr)
    i++

main()
