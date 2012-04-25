var $echo, $echo_compile, $echo_emit, $echo_eval, $echo_expand, $echo_normalize, $echo_sexp, ev, expandAndEval, f, loadToplevel, t;
t = true;
f = false;
$echo = Var('*echo*', f);
$echo_sexp = Var('*echo:sexp*', f);
$echo_expand = Var('*echo:expand*', f);
$echo_normalize = Var('*echo:normalize*', f);
$echo_compile = Var('*echo:compile*', f);
$echo_emit = Var('*echo:emit*', f);
$echo_eval = Var('*echo:eval*', f);
ev = function(src) {
  var func;
  func = new Function(["RT"], src);
  return func(RT);
};
expandAndEval = function(env, sexp) {
  var a, b, c, d, e;
  if ($echo_sexp()) {
    prn(sexp);
  }
  a = expand(env, sexp);
  if ($echo_expand()) {
    prn(a);
  }
  b = normalize(a);
  if ($echo_normalize()) {
    prn(b);
  }
  c = Compiler.compileToplevel(b);
  if ($echo_compile()) {
    prn(c);
  }
  d = Emitter.emitToplevel(c);
  if ($echo_emit()) {
    println(d);
  }
  e = ev(d);
  if ($echo_eval()) {
    prn(e);
  }
  if ($echo()) {
    prn();
  }
  return e;
};
loadToplevel = function(reader) {
  var env, expand1, pkg, result, sexp, sexps;
  pkg = $PACKAGE();
  env = pkg.env;
  sexps = [];
  result = null;
  expand1 = function(sexp) {
    var transformer, _sexp;
    if (isSpecialFormCall(env, sexp, "do")) {
      return sexps = sexp.tail.toArray().concat(sexps);
    } else if (isSpecialFormCall(env, sexp, "import")) {
      return raise('not implemented');
    } else if (isSpecialFormCall(env, sexp, "include")) {
      return raise('not implemented');
    } else if (isSpecialFormCall(env, sexp, "define*")) {
      _sexp = cons(baseSymbol("set!"), sexp.tail);
      return result = expandAndEval(env, _sexp);
    } else if (isSpecialFormCall(env, sexp, "define-macro*")) {
      transformer = expandAndEval(env, sexp.tail.tail.head);
      return Package.intern(pkg, sexp.tail.head, Macro.create(env, transformer));
    } else {
      return result = expandAndEval(env, sexp);
    }
  };
  while (!reader.isEmpty()) {
    sexp = reader.readSexp();
    sexps.push(sexp);
    while (sexps.length > 0) {
      expand1(sexps.shift());
    }
  }
  return result;
};