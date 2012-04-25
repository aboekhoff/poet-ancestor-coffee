# begin normalizer

isSpecialFormSymbol = (x) ->
  x instanceof Symbol &&
  x.ns == baseNS &&
  SpecialForm.cache[x.name]

normalize = (x) ->
  if x instanceof List &&
       x.head instanceof Symbol &&
       contains($COMPILER_MACROS(), x.head)
    x = get($COMPILER_MACROS(), x.head)(x)
  postNormalize(x)

postNormalize = (x) ->
  if      x instanceof List    then normalizeList(toArray(x))
  else if x instanceof Array   then ['ARRAY', _normalize(x)]
  else if x instanceof Symbol
    if x.ns
      ['GLOBAL', x.ns, x.name]
    else
      ['VAR', x.name]
  else ['VAL', x]

_normalize = (xs) ->
  for x in xs
    normalize(x)

baseGlobal = (name) ->
  ['GLOBAL', baseNS, name]

normalizeQuote = (x) ->
  if x instanceof Symbol
    ['NEW', baseGlobal('Symbol'), [['VAL', x.name], ['VAL', x.ns]]]
  else if x instanceof List
    ['CALL', baseGlobal('list'), _normalizeQuote(toArray(x))]
  else if x instanceof Array
    ['ARRAY', _normalizeQuote(x)]
  else
    ['VAL', x]

_normalizeQuote = (xs) ->
  for x in xs
    normalizeQuote(x)

normalizeCall = (x) ->
  ['CALL', normalize(x[0]), _normalize(x.slice(1))]

normalizeBindings = (xs) ->
  xs = toArray(xs)
  ys = []
  for x in xs
    x = toArray(x)
    ys.push [normalize(x[0]), normalize(x[1])]
  ys

normalizeList = (x) ->
  if isSpecialFormSymbol(x[0])
    switch x[0].name
      when 'do'
        ['DO', _normalize(x.slice(1))]
      when 'if'
        ['IF', normalize(x[1]), normalize(x[2]), normalize(x[3])]
      when 'let'
        ['LET', normalizeBindings(x[1]), normalize(x[2])]
      when 'letrec'
        ['LETREC', normalizeBindings(x[1]), normalize(x[2])]
      when 'set!'
        ['SET!', normalize(x[1]), normalize(x[2])]
      when '.'
        ['FIELD', normalize(x[1]), normalize(x[2])]
      when 'block'
        ['BLOCK', normalize(x[1]), normalize(x[2])]
      when 'loop'
        ['LOOP', normalize(x[1])]
      when 'return-from'
        ['RETURN_FROM', normalize(x[1]), normalize(x[2])]
      when 'new'
        [_, callee, args] = normalizeCall(x.slice(1))
        ['NEW', callee, args]
      when 'throw'
        ['THROW', normalize(x[1]), normalize(x[2])]
      when 'fn*'
        node = ['FUNCTION',
                _normalize(toArray(x[1])),
                normalize(x[2])]
                #prn(node)
        node
      when 'js*'
        ['RAW', x[1]]
      when 'quote'
        normalizeQuote(x[1])
      else
        raise('[BUG] no normalize clause for special-form: ' + x[0].name)
  else
    normalizeCall(x)

# compiler

class Scope
  constructor: (@level) ->
    @level         ||= 0
    @numLocals     =   0
    @numLabels     =   0
    @numExceptions =   0

class Compiler
    constructor: (@env, @scope, @block) ->
        @env   ||= new Map()
        @scope ||= new Scope(0)
        @block ||= []

    extendEnv: () ->
        new Compiler(Map.extend(@env), @scope, @block)

    extendBlock: (block) ->
        new Compiler(@env, @scope, block || [])

    extendScope: () ->
        new Compiler(
          Map.extend(@env),
          new Scope(@scope.level + 1),
          [])

    callWithBlock: (thunk) ->
        c = @extendBlock()
        thunk()
        c.block

    finalize: () ->
        if @scope.numLocals > 0
            i = 0
            vs = []
            while i < @scope.numLocals
                vs.push(['LOCAL', @scope.level, i])
                i++
            @block.unshift(['DECLARE', vs])

    push: (x, t) ->
        if t then x = t(x)
        @block.push(x)
        null

    maybePush: (x, t) ->
        if t then @push(x, t)
        null

    getVar: (v) ->
      get(@env, v)

    getLabel: (l) ->
      get(@env, ['LABEL', l])

    makeLocal: () ->
      id = @scope.numLocals++
      ['LOCAL', @scope.level, id]

    makeLabel: () ->
      id = @scope.numLabels++
      ['LABEL', @scope.level, id]

    makeException: () ->
      id = @scope.numExceptions++
      ['EXCEPTION', @scope.level, id]

    bindLocal: (name) ->
      local = @makeLocal()
      put(@env, name, local)
      local

    bindLabel: (name, data) ->
      put(@env, ['LABEL', name], data)
      data

    bindException: (name) ->
      exception = @makeException()
      put(@env, name, exception)
      exception

    bindArgs: (args) ->
      _args = []
      for a, i in args
        _a = ['ARG', @scope.level, i]
        put(@env, a, _a)
        _args.push(_a)
      _args

    serializeToAtom: (x) ->
      [tag, a, b, c] = x
      switch tag
        when 'VAL'    then x
        when 'VAR'    then @getVar(x)
        when 'GLOBAL' then x
        else
          v = @makeLocal()
          @compile(x, Compiler.tracerFor(v))
          v

    _serialize: (xs) ->
        for x in xs
            @serialize(x)

    serialize: (x) ->
        [tag, a, b, c] = x
        switch tag
            when 'VAR'         then @getVar(x)
            when 'RAW'         then x
            when 'VAL'         then x
            when 'GLOBAL'      then x
            when 'FIELD'       then ['FIELD', @serialize(a), @serialize(b)]
            when 'CALL'        then ['CALL', @serialize(a), @_serialize(b)]
            when 'NEW'         then ['NEW', @serialize(a), @_serialize(b)]
            when 'THROW'       then @compile(x); ['VAL', null]
            when 'RETURN_FROM' then @compile(x); ['VAL', null]
            when 'SET!'
                a = @serialize(a)
                @compile(b, Compiler.tracerFor(a))
                a
            else
                v = @makeLocal()
                @compile(x, Compiler.tracerFor(v))
                v

    compileDo: (xs, t) ->
        if xs.length == 0
            @compile(['VAL', null], t)
        else
            i = 0
            e = xs.length - 1
            while i < e
                @compile(xs[i])
                i++
            @compile(xs[i], t)

    compileLet: (pairs, body, tracer) ->
        _compiler = @extendEnv()
        _pairs = []

        # run through the bindings and allocate locals
        for [v, x] in pairs
            _v = _compiler.bindLocal(v)
            _pairs.push([_v, x])

        # run through the expressions and compile
        for [_v, x] in _pairs
            @compile(x, Compiler.tracerFor(_v))

        _compiler.compile(body, tracer)

    compileLetRec: (pairs, body, tracer) ->
        _compiler = @extendEnv()
        _pairs = []

        for [v, x] in pairs
            _v = _compiler.bindLocal(v)
            _pairs.push([_v, x])

        for [v, x] in _pairs
            _compiler.compile(x, Compiler.tracerFor(v))

        _compiler.compile(body, tracer)

    compileFunction: (args, body, tracer) ->
        c    = @extendScope()
        ret  = c.makeLocal()
        args = c.bindArgs(args)
        c.compile(body, Compiler.tracerFor(ret))
        c.push(['RETURN', ret])
        c.finalize()
        node = ['FUNCTION', args, c.block]
        #p(node)
        @maybePush(node, tracer)

    compileReturnFrom: (labelName, value) ->
        [label, tracer, sentinelGetter] = @getLabel(labelName)
        level = label[1]
        @compile(value, tracer)
        if level == @scope.level
            @push(['BREAK', label])
        else
            @push(['SET!', sentinelGetter(), ['VAL', false]])
            @push(['THROW', ['VAL', 'NON_LOCAL_EXIT']])

    compileControlStructure: (tag, labelName, body, tracer) ->
        compiler = @extendEnv()
        sentinel = null
        getter   = (() -> sentinel || sentinel = compiler.makeLocal())
        label    = compiler.makeLabel()
        compiler.bindLabel(labelName, [label, tracer, getter])

        body     = compiler.compileBlock(body, tracer)
        if sentinel
          body.unshift(['SET!', sentinel, ['VAL', true]])
        @push([tag, sentinel, label, body])

    compileBlock: (x, t) ->
        c = @extendBlock()
        c.compile(x, t)
        c.block

    compile: (x, t) ->
        [tag, a, b, c] = x
        switch tag
            when 'RAW'         then @push(x, t)
            when 'VAR'         then @maybePush(@getVar(x), t)
            when 'VAL'         then @maybePush(x, t)
            when 'GLOBAL'      then @maybePush(x, t)

            when 'ARRAY'
              @maybePush(['ARRAY', @_serialize(a)], t)

            when 'FIELD'       then @maybePush(@serialize(x), t)
            when 'CALL'        then @push(@serialize(x), t)
            when 'NEW'         then @push(@serialize(x), t)
            when 'THROW'       then @push(['THROW', @serialize(a)])
            when 'DO'          then @compileDo(a, t)
            when 'BLOCK'       then @compileControlStructure('BLOCK', a, b, t)
            when 'LOOP'        then @compileControlStructure('LOOP', ['VAL', null], a, t)
            when 'LET'         then @compileLet(a, b, t)
            when 'LETREC'      then @compileLetRec(a, b, t)
            when 'RETURN_FROM' then @compileReturnFrom(a, b)
            when 'FUNCTION'    then @compileFunction(a, b, t)

            when 'IF'
                a = @serializeToAtom(a)
                b = @compileBlock(b, t)
                c = @compileBlock(c, t)
                @push(['IF', a, b, c])

            when 'SET!'
                a = @serialize(a)
                @compile(b, Compiler.tracerFor(a))
                @maybePush(a, t)

            else
              raise('[BUG] unhandled tag in compile ' + tag)

    @tracerFor: (location) ->
        (value) -> ['SET!', location, value]

    @compileToplevel: (x) ->
        c = new Compiler()
        ret = c.makeLocal()
        c.compile(x, Compiler.tracerFor(ret))
        c.finalize()
        c.push(['RETURN', ret])
        c.block

    @compilerMacros: new Map()

# emitter
#

class Emitter
    constructor: (@buffer, @indentSize) ->
        @buffer     ||= []
        @indentSize ||= 4
        @indention  = 0

    toString: () ->
        @buffer.join("")

    indent: () ->
        @indention += @indentSize

    unindent: () ->
        @indention -= @indentSize

    emitGlobal: (a, b) ->
        @p("RT[\"" + a + "#" + b + "\"]")

    emitLocal: (a, b) ->
        @p("x_" + a + "_" + b)

    emitLabel: (a, b) ->
        @p("block_" + a + "_" + b)

    emitArg: (a, b) ->
        @p("a_" + a + "_" + b)

    emitVal: (x) ->
        if typeof x == 'string'
            @p(JSON.stringify(x))
        else
            @p('' + x)

    tab: () ->
        i = 0
        while i < @indention
            @p(" ")
            i++

    cr: () ->
        @p("\n")
        @tab()

    p: () ->
        for x in arguments
            @buffer.push(x)
        this

    commas: (nodes) ->
        many = false
        for node in nodes
            if many then @p(", ") else many = true
            @emit(node)

    list: (nodes) ->
        @p("(")
        @commas(nodes)
        @p(")")

    brackets: (nodes) ->
        @p("[")
        @commas(nodes)
        @p("]")

    emitBlock: (nodes) ->
        if nodes.length == 0
            @p("{}")
        else
            @p("{")
            @indent()
            for node in nodes
                @cr()
                @emit(node)
                @p(";")
            @unindent()
            @cr()
            @p("}")

    emitIf: (a, b, c) ->
        @p("if (!(")
        @emit(a)
        @p(" == null || ")
        @emit(a)
        @p(" === false)) ")
        @emitBlock(b)
        if c && c.length != 0
            @p(" else ")
            if c[0][0] == 'IF' && c.length == 1
                @emit(c[0])
            else
                @emitBlock(c)

    emitControlStructure: (prefix, sentinel, label, body) ->
      if sentinel
        @p("try {")
        @indent()
        @cr()

      @emit(label)
      @p(":")
      @p(prefix)

      @emitBlock(body)

      if sentinel
        @unindent()
        @cr()
        @p("} catch(e) {")
        @indent()
        @cr()
        @p("if (")
        @emit(sentinel)
        @p(") ")
        @p("throw e;")
        @unindent()
        @cr()
        @p("} finally {")
        @indent()
        @cr()
        @emit(sentinel)
        @p(" = false;")
        @unindent()
        @cr()
        @p("}")



    emit: (node) ->
        [tag, a, b, c, d] = node
        switch tag
            when 'VAL'    then @emitVal(a)
            when 'ARG'    then @emitArg(a, b)
            when 'LOCAL'  then @emitLocal(a, b)
            when 'LABEL'  then @emitLabel(a, b)
            when 'GLOBAL' then @emitGlobal(a, b)
            when 'IF'     then @emitIf(a, b, c)
            when 'RAW'    then @p(a)

            when 'BLOCK'
                #p(node)
                @emitControlStructure("", a, b, c)

            when 'LOOP'
                @emitControlStructure("for(;;)", a, b, c)

            when 'FIELD'
                @emit(a)
                @p("[")
                @emit(b)
                @p("]")

            when 'SET!'
                @emit(a)
                @p(" = ")
                @emit(b)

            when 'CALL'
                @emit(a)
                @list(b)

            when 'NEW'
                @p("new ")
                @emit(a)
                @list(b)

            when 'RETURN'
                @p("return ")
                @emit(a)

            when 'BREAK'
                @p("break ")
                @emit(a)

            when 'DECLARE'
                @p("var ")
                @commas(a)

            when 'FUNCTION'
                @p("function")
                @list(a)
                @p(" ")
                @emitBlock(b)

            when 'ARRAY'
                @brackets(a)

            when 'THROW'
              @p("throw ")
              @emit(a)

            else
                throw Error("[BUG] invalid tag sent to emitter " + tag)

        this

    @emitToplevel: (toplevel) ->
        new Emitter().emitBlock(toplevel).toString()
