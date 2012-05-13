# the expander needs to track vars and labels
# in separate namespaces to cope with the hygiene mechansim
# the compiler can get by with normal maps

# delaying the rewrite of expander classes
# at the moment there's very little need to
# have a lisp friendly api to the internal
# expander mechanisms, compared to the core
# data structures

class Env
  constructor: (@vars, @labels) ->
    @vars   ||= new Map()
    @labels ||= new Map()

  extend: () ->
    new Env(Map.extend(@vars), Map.extend(@labels))

  get: (which, key) ->
    if Symbol.isQualified(key)
      _env = Package.get(key.ns).env
      _key = Symbol.unqualify(key)
      return _env.get(which, _key)
    loop
      dict = this[which]
      val  = get(dict, key, null)
      if val
        return val
      else if Symbol.isTagged(key)
        env = key.tags.head.env
        key = Symbol.untag(key)
      else
        return null

  getVar:    (x) -> @get('vars', x)
  getLabel:  (x) -> @get('labels', x)

  putVar: (x, y) ->
    put(@vars, x, y)

  putLabel: (x, y) ->
    put(@labels, x, y)

  bindGlobal: (x) ->
    _x = Package.intern($PACKAGE(), x)
    @putVar(x, _x)
    _x

  bindLocal: (x)  ->
    _x = if x instanceof Symbol then Symbol.reify(x) else x
    @putVar(x, _x)
    _x

  bindLabel: (x)  ->
    _x = if x instanceof Symbol then Symbol.reify(x) else x
    @putLabel(x, _x)
    _x

  makeTag: ()  -> new Tag(this)

class Package
    constructor: (@name) ->
        @env       = new Env()
        @imports   = new Set()
        @exports   = new Set()
        @reexports = new Set()

    toString: () -> @name

    @intern: (pkg, sym, val) ->
        rsym = Symbol.reify(sym)
        qsym = val || new Symbol(rsym.name, pkg.name)
        pkg.env.putVar(rsym, qsym)
        Set.put(pkg.exports, rsym)
        return qsym

    @import: (importer, importee) ->
      exports = toArray(importee.exports)
      if exports.length > 0
        put(importer.imports, importee.name)
        for exp in toArray(importee.exports)
          val = importee.env.getVar(exp)
          Package.intern(importer, exp, val)
      for pkgName in toArray(importee.reexports)
        Package.import(importer, Package.get(pkgName))

    @cache:  {}
    @exists: (name) -> Package.cache.hasOwnProperty(name)
    @get:    (name) -> Package.cache[name] ||= new Package(name)

    @createStandardPackage: (name) ->
      if !Package.exists(name)
        Package.import(Package.get(name), Package.get(baseNS))
      Package.get(name)

    @load:   (name) ->
        if !Package.exists(name)
          raise('Package.load not configured')
        Package.get(name)

class Macro
    constructor: (@transformer) ->

    @create: (definingEnv, transformer) ->
        #console.log(transformer.toString())
        _transformer = (callingEnv, input) ->
            tag = new Tag(definingEnv)

            sanitize = Macro.createSanitizer(tag)
            capture  = Macro.createCapturer(tag)
            compare  = Macro.createComparator(tag)

            input = sanitize(input)
            output = sanitize(transformer(input, capture, compare))
            #console.log("transformed!")
            #console.log(output)
            return output
        new Macro(_transformer)

    @makeWalker = (f) ->
      walk = (x) ->
        if      x instanceof Symbol then f(x)
        else if x instanceof Array  then map(walk, x)
        else if x instanceof List   then map(walk, x)
        else if x instanceof Set    then map(walk, x)
        else if x instanceof Map
          g = (y) -> map(walk, y)
          map(g, x)
        else x

    @createSanitizer = (t) ->
      Macro.makeWalker((x) -> Symbol.swapTag(x, t))

    @createCapturer = (t) ->
      Macro.makeWalker((x) -> Symbol.ensureTag(x, t))

    @createComparator = (t) ->
        (x, y) ->
            if x instanceof Symbol && y instanceof Symbol
                _x = x.swapTag(t)
                _y = y.swapTag(t)
                callingEnv.getVar(_x) == callingEnv.getVar(_y)


class SpecialForm
    constructor: (@name, @transformer) ->

    toSymbol: () ->
        baseSymbol(@name)

    @define = (object) ->
        for name, transformer of object
            SpecialForm.cache[name] = new SpecialForm(name, transformer)
        null

    @cache  = {}
    @get    = (name) -> @cache[name]

SpecialForm.define({

    "include" : (e, x) ->
        raise("include outside of toplevel")

    "import" : (e, x) ->
        raise("import outside of toplevel")

    "define*" : (e, x) ->
        raise("define* outside of toplevel")

    "define-macro*" : (e, x) ->
        raise("define-macro* outside of toplevel")

    "do" : (e, x) ->
        expandBody(e, x)

    "if" : (e, x) ->
        List.create(
            baseSymbol("if"),
            expand(e, x.head),
            expand(e, x.tail.head),
            expand(e, x.tail.tail.head))

    "set!" : (e, x) ->
        List.create(
           baseSymbol("set!"),
           expand(e, x.head),
           expand(e, x.tail.head)
        )

    "throw!" : (e, x) ->
        List.create(
            baseSymbol("throw!"),
            expand(e, x.head)
        )

    "." : (e, x) ->
        List.create(
            baseSymbol("."),
            expand(e, x.head),
            expand(e, x.tail.head)
        )

    "block" : (e, x) ->
        e = e.extend()
        List.create(
            baseSymbol("block"),
            e.bindLabel(x.head),
            expandBody(e, x.tail)
        )

    "loop" : (e, x) ->
        e = e.extend()
        e.bindLabel(null)
        List.create(
            baseSymbol("loop"),
            expandBody(e, x)
        )

    "return-from" : (e, x) ->
        List.create(
            baseSymbol("return-from"),
            e.getLabel(x.head),
            expand(e, x.tail.head)
        )

    "unwind-protect" : (e, x) ->
        List.create(
            baseSymbol("unwind-protect"),
            expand(e, x.head),
            expand(e, x.tail.head)
        )

    "let*" : (e, x) ->
      res = []

      forEach(
        (pair) ->
          expr = expand(e, second(pair))
          e    = e.extend()
          sym  = e.bindLocal(first(pair))
          res.push([sym, expr])
          null
        x.head)

      e    = e.extend()
      body = expandBody(e, x.tail)

      fin = List.create(
        baseSymbol("let*"),
        res,
        expandBody(e, x.tail)
      )

      fin

    "letrec*" : (e, x) ->
      body = toArray(x.tail)
      expandLetRec(e, x.head, x.tail)

    "js*" : (e, x) ->
        List.create(
            baseSymbol("js*"),
            x.head
        )

    "quote" : (e, x) ->
        List.create(
            baseSymbol("quote"),
            x.head
        )

    "fn*" : (e, x) ->
        e = e.extend()
        args = []
        for arg in toArray(x.head)
            args.push(e.bindLocal(arg))
        $args = List.fromArray(args)
        body = expandBody(e, x.tail)
        form = List.create(
            baseSymbol("fn*"),
            List.fromArray(args),
            body
        )
        #println("expanded function")
        #prn(form)
        form

    "quasiquote" : (e, x) ->
      expand(e, expandQuasiquote(e, x.head))

    "unquote" : (e, x) ->
      raise("unquote outside of quasiquote")

    "unquote-splicing" : (e, x) ->
      raise("unquote splicing outside of quasiquote")

    "new" : (e, x) ->
      ex = (x) -> expand(e, x)
      cons(baseSymbol("new"), map(ex, x))

    "throw" : (e, x) ->
      List.create(baseSymbol("throw"), expand(e, x.head))
})

# expander helpers

isSpecialFormCall = (e, x, name) ->
    x instanceof List && e.getVar(x.head) == SpecialForm.get(name)

macroexpand1 = (e, x) ->
    if x instanceof List
        val = e.getVar(x.head)
        if val instanceof Macro
            return val.transformer(e, x)
    return x

macroexpand = (e, x) ->
    y = macroexpand1(e, x)
    loop
      if x == y
        return y
      else
        x = y
        y = macroexpand(e, x)

expand = (e, x) ->
    x = macroexpand(e, x)
    switch true
        when x instanceof Symbol
            expandSymbol(e, x)
        when x instanceof List
            expandList(e, x)
        when x instanceof Array
            expandArray(e, x)
        when x instanceof Map
            expandMap(e, x)
        when x instanceof Set
            expandSet(e, x)
        else
            x

expandSymbol = (e, x) ->
    val = e.getVar(x)
    if !val
        e.bindGlobal(x)
    else if val instanceof Macro
        raise("can't take value of macro", x)
    else if val instanceof SpecialForm
        raise("can't take value of special form", x)
    else val

expandArray = (e, xs) ->
  for x in xs
    expand(e, x)

expandMap = (e, d) ->
  _d = new Map()
  for [k, v] in toArray(d)
    put(_d, expand(e, k), expand(e, v))
  _d

expandList = (e, x) ->
  val = e.getVar(x.head)
  # prn(x.head, val)
  if val instanceof SpecialForm
    val.transformer(e, x.tail, x)
  else expandCall(e, x)

expandQuasiquote = (e, x) ->
  q = (x) ->
    if isSpecialFormCall(e, x, "unquote")
      x.tail.head

    else if isSpecialFormCall(e, x, "quasiquote")
      List.create(baseSymbol("quote"), x)

    else if x instanceof Array
      qq(x)

    else if x instanceof List
      List.create(
        baseSymbol('from-array'),
        baseSymbol('List'),
        qq(x)
      )

    else if x instanceof Map
      List.create(
        baseSymbol('from-array'),
        baseSymbol('Map'),
        qq(x)
      )

    else if x instanceof Set
      List.create(
        baseSymbol('array->set'),
        baseSymbol('Set'),
        qq(x)
      )

    else if x instanceof Symbol
      List.create(baseSymbol('quote'), x)
    else
      x

  _q = (x) ->
    if isSpecialFormCall(e, x, "unquote-splicing")
      x.tail.head
    else
      [q(x)]

  qq = (x) ->
    cons(baseSymbol('concat'), map(_q, x))

  q(x)

isFrontDotted = (x) ->
  x instanceof Symbol && /^\.[^\.]+$/.test(x.name)

expandCall = (e, ls) ->
  head = first(ls)
  if isFrontDotted(head)
    method = head.name.substring(1)
    _ls    = List.create(baseSymbol("."), ls.tail.head, method)
    _ls    = cons(_ls, ls.tail.tail)
    expand(e, _ls)
  else
    ex = (x) -> expand(e, x)
    map(ex, ls)

flattenBody = (e, xs) ->
    result = []
    loop
        if xs.length == 0
            return result
        else
            x = macroexpand(e, xs.shift())
            if isSpecialFormCall(e, x, "do")
                xs = concat(x.tail, xs)
            else
                result.push(x)

collectDefines = (e, xs) ->
  rem  = xs.slice()
  defs = []

  while rem.length
    x = rem.shift()
    if isSpecialFormCall(e, x, "define*")
      defs.push([x.tail.head, x.tail.tail.head])
    else
      rem.unshift(x)
      break

  [defs, rem]

expandBody = (e, xs) ->
    xs = toArray(xs)
    xs = flattenBody(e, xs)
    [defs, rem] = collectDefines(e, xs)

    if defs.length > 0
      expandLetRec(e, defs, rem)
    else
      for x, i in rem
        rem[i] = expand(e, x)
      switch rem.length
        when 0 then null
        when 1 then rem[0]
        else
          cons(baseSymbol("do"), List.fromArray(rem))

expandLetRec = (e, defs, body) ->
  defs = toArray(defs)
  body = toArray(body)
  e = e.extend()
  names    = []
  exprs    = []
  bindings = []

  for pair in defs
    names.push(e.bindLocal(first(pair)))

  for pair in defs
    exprs.push(expand(e, second(pair)))

  for x, i in names
    bindings.push([x, exprs[i]])

  res = List.create(
    baseSymbol("letrec*"),
    bindings,
    expandBody(e, body)
  )

  #prn(res)

  res
