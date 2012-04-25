{spawn, exec}                 = require 'child_process'
{join}                        = require 'path'
{readFileSync, writeFileSync} = require 'fs'

project = 'gandalf'

baseTargets = [
  'core'
  'reader'
  'expander'
  'compiler'
  'bootstrap'
  'evaluator'
]

nodeTargets    = baseTargets.concat(['main'])
browserTargets = baseTargets.concat(['browser-main'])

paste = (options) ->
  options ||= {}
  targets = options.targets
  outfile = options.outfile
  outdir  = options.outdir
  shebang = options.shebang

  buf = []
  for t in targets
    p = join('lib', t + '.js')
    f = readFileSync(p, 'utf8')
    buf.push(f)

  txt = "(function() {\n\n" + buf.join("\n\n") + "\n\n})();"
  if shebang
    txt = "#!/usr/bin/env node\n\n" + txt
  outfile = join(outdir, outfile + ".js")
  writeFileSync(outfile, txt)
  console.log('wrote ' + outfile)

option '-w', '--watch', 'watch src dir for changes and rebuild'

task 'build', 'build gandalf', (options) ->
  cmd = if options.watch then '-cw' else '-c'
  coffee = spawn 'coffee', [cmd , '-b', '-o', 'lib', 'src']
  coffee.stdout.on 'data', (data) ->
    console.log(data.toString().trim())
    paste(
      targets: nodeTargets
      outfile: 'gandalf'
      outdir:  'lib'
      shebang: true
    )
    paste(
      targets: browserTargets
      outfile: 'gandalf-browser'
      outdir:  'browser'
      shebang: false
    )
