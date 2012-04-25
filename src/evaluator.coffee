t = true
f = false

$echo           = Var('*echo*', f)
$echo_sexp      = Var('*echo:sexp*', f)
$echo_expand    = Var('*echo:expand*', f)
$echo_normalize = Var('*echo:normalize*', f)
$echo_compile   = Var('*echo:compile*', f)
$echo_emit      = Var('*echo:emit*', t)
$echo_eval      = Var('*echo:eval*', f)

ev = (src) ->
  func = new Function(["RT"], src)
  func(RT)

expandAndEval = (env, sexp) ->
  if $echo_sexp() then prn(sexp)

  a = expand(env, sexp)
  if $echo_expand() then prn(a)

  b = normalize(a)
  if $echo_normalize() then prn(b)

  c = Compiler.compileToplevel(b)
  if $echo_compile() then prn(c)

  d = Emitter.emitToplevel(c)
  if $echo_emit() then println(d)

  e = ev(d)
  if $echo_eval() then prn(e)

  if $echo() then prn()

  return e

loadToplevel = (reader) ->
  pkg     = $PACKAGE()
  env     = pkg.env
  sexps   = []
  result  = null

  expand1 = (sexp) ->
    sexp = macroexpand(env, sexp)

    if isSpecialFormCall(env, sexp, "do")
      sexps = concat(sexp.tail, sexps)

    else if isSpecialFormCall(env, sexp, "import")
      raise('not implemented')

    else if isSpecialFormCall(env, sexp, "include")
      raise('not implemented')

    else if isSpecialFormCall(env, sexp, "define*")
      _sexp = cons(baseSymbol("set!"), sexp.tail)
      result = expandAndEval(env, _sexp)

    else if isSpecialFormCall(env, sexp, "define-macro*")
      transformer = expandAndEval(env, sexp.tail.tail.head)
      Package.intern(
        pkg,
        sexp.tail.head,
        Macro.create(env, transformer)
      )

    else
      result = expandAndEval(env, sexp)

  while !reader.isEmpty()
    sexp = reader.readSexp()
    sexps.push(sexp)
    while sexps.length > 0
      expand1(sexps.shift())

  return result
