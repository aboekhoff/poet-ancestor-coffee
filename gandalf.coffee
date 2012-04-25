



# this is intended to be a throwaway compiler for bootstrapping
# misc

basePackageName = "gandalf"

baseSymbol = (name) ->
    new Symbol(name, basePackageName)

raise = (msg) ->
    throw Error(msg)

RT = {}

# polyfill

Array.prototype.toArray = () -> this.slice()

# boxed types

class Ref
    constructor: (@aggregate, @index) ->
        if !@aggregate
            @aggregate = []
            @index     = 0

    get:  ()    -> @aggregate[@index]
    set:  (val) -> @aggregate[@index] = val
    bind: (val, thunk) ->
        _val = @get()
        try
            @set(val)
            thunk()
        finally
            @set(_val)

# datatypes

class List
    constructor: (@head, @tail, @size) ->
        Object.freeze(this)

    cons: (x) -> new List(x, @, @size + 1)

    toArray: () ->
        ls  = this
        arr = []
        arr.length = ls.size
        i = 0
        while ls.size > 0
            arr[i] = ls.head
            ls = ls.tail
            i++
        return arr

    represent: (x, p, m) ->
        p('(')
        _represent(x.toArray(), p, m)
        p(')')

    toKey: () ->
        this._key ||= "list:" + this.toArray().toKey()

    @fromArray: (arr) ->
        ls = new List(null, null, 0)
        i  = arr.length
        j  = 1
        while i--
            ls = new List(arr[i], ls, j)
            j++
        ls

    @create: () ->
        List.fromArray(arguments)

class Symbol
    constructor: (@name, @namespace, @tags) ->
        @namespace ||= null
        @tags      ||= List.create()

    toString: () -> @name

    represent: (x, p, m) ->
        if x.namespace
            p("##")
            p(x.namespace)
            p("#")

        if x.tags.size > 0
            for t in x.tags.toArray()
                p("#:" + t.id)
            p(":")

        p(x.name)

    toKey: () ->
        if @namespace
            "ns-symbol:" + @namespace + " " + @name
        else if @tags.size > 0
            "tagged-symbol:" + @tags.toKey() + ":" + @name
        else
            "symbol:" + @name

    removeTag: (tag) ->
        if @tags.head == tag
            new Symbol(@name, null, @tags.tail)
        else
            @

    ensureTag: (tag) ->
        if @namespace then return this
        if !@namespace && @tags.head != tag
            new Symbol(@name, null, @tags.cons(tag))
        else
            this

    swapTag: (tag) ->
        if @namespace then return this
        if @tags.head == tag
            return new Symbol(@name, null, @tags.tail)
        else
            return new Symbol(@name, null, @tags.cons(tag))

    qualify:   (ns) -> new Symbol(@name, ns, [])
    unqualify: ()   -> new Symbol(@name)
    reify: () ->
        if this.tags.size > 0
            new Symbol("_" + this.tags.toArray().join(":") + ":" + this.name)
        else
            this

class Keyword
    constructor: (@name) ->
    toKey: () -> "keyword:" + @name
    represent: (x, p, m) ->
        p("#:" + x.name)
    @cache: {}
    @create: (name) ->
        if (name instanceof Keyword)
            return name
        key = "%" + name
        if key of Keyword.cache
            return Keyword.cache[key]
        else @cache[key] = new Keyword(name)

class Tag
    constructor: (@env) ->
        @id = Tag.nextId++

    toKey: () ->
        "tag:" + @id

    toString: () ->
        "#:"  + @id

    @nextId = 1

class Dict
    constructor: (@bindings) ->
        @bindings ||= [{}]

    extend: () ->
        bs = @bindings.slice()
        bs.unshift({})
        new Dict(bs)

    getEntry: (key) ->
        k = Dict.toKey(key)
        for b in @bindings
            if k of b then return b[k]
        return null

    get: (key, notFound) ->
        entry = @getEntry(key)
        if entry then entry[1] else notFound

    put: (key, val) ->
        if arguments.length > 2
            i = 0
            while i < arguments.length
                @put(arguments[i], arguments[i+1])
                i = i + 2
        else
            _key = Dict.toKey(key)
            @bindings[0][_key] = [key, val]
        this

    keys: () ->
        seen = {}
        arr = []

        for b in @bindings
            for k of b
                if b.hasOwnProperty(k)
                    if !seen[k]
                        seen[k] = true
                        arr.push(b[k][0])
        arr

    vals: () ->
        seen = {}
        arr = []

        for b in @bindings
            for k of b
                if b.hasOwnProperty(k)
                    if !seen[k]
                        seen[k] = true
                        arr.push(b[k][1])
        arr

    contains: (key) ->
        k = Dict.toKey(key)
        for b in @bindings
            if b.hasOwnProperty(k)
                return true
        return false

    toArray: () ->
        seen = {}
        arr = []

        for b in @bindings
            for k of b
                if b.hasOwnProperty(k)
                    if !seen[k]
                        seen[k] = true
                        arr.push(b[k])
        arr

    represent: (x, p, m) ->
        xs = x.toArray()
        p("#<Dict")
        if xs.length > 0
            p(" ")
            _represent(xs, p, m)
        p(">")

    @toKey: (x) ->
        switch x
            when null
                "null"
            when undefined
                "undefined"
            when true
                "true"
            when false
                "false"
            else
                x.toKey()

    @fromArray: (arr) ->
        d = new Dict()
        if arr.length > 0
            d.put.apply(d, arr)
        d

    @create: () ->
        Dict.fromArray(arguments)

class Set
    constructor: (dict) ->
        @dict ||= new Dict()

    extend: () ->
        new Set(@dict.extend())

    put: () ->
        for key in arguments
            @dict.put(key, true)

    get: (key) ->
        @dict.get(key)

    contains: (key) ->
        @dict.contains(key)

    toArray: () ->
        @dict.keys()

    represent: (x, p, m) ->
        xs = x.toArray()
        p("#<Set")
        if xs.length > 0
            p(" ")
            _represent(xs, p, m)
        p(">")

Number.prototype.toKey = () ->
    "number:" + this.toString()

String.prototype.toKey = () ->
    "string:" + this.toString()

Array.prototype.toKey = () ->
    _key = []
    for x in this
        _key.push(Dict.toKey(x))
    "[" + _key.join(" ") + "]"

# basic printing

$out     = new Ref(RT, "gandalf#*out*")
$package = new Ref(RT, "gandalf#*package*")

if typeof process != 'undefined'
    $out.set((x) -> process.stdout.write(x))
else
    $out.set(() ->)

String.prototype.represent = (x, p, m) ->
    if m then p(JSON.stringify(x)) else p(x)

Number.prototype.represent = (x, p, m) ->
    if x != x then p('#nan') else p ('' + x)

Boolean.prototype.represent = (x, p, m) ->
    if x then p('#t') else p('#f')

Function.prototype.represent = (x, p, m) ->
  name = x.__name || x.name
  if name then name = " " + name
  p("#<Function" + name + ">")

Array.prototype.represent = (x, p, m) ->
    p("[")
    _represent(x, p, m)
    p("]")

_represent = (xs, p, m) ->
    many = false
    for x in xs
        if many then p(' ') else many = true
        represent(x, p, m)

represent = (x, p, m) ->
    if x == null then return p('#nil')
    if x == undefined then return p('#void')
    if x.represent then return x.represent(x, p, m)
    else
        if x.constructor && x.constructor.name
            s = x.constructor.name
        else
            s = "Object"
        if x.toString && x.toString != Object.prototype.toString
            s += " " + JSON.stringify(x.toString())
        p("#<" + s + ">")

newline = () ->
    $out.get()("\n")

pr  = () ->
    _represent(arguments, $out.get(), true)

prn = () ->
    _represent(arguments, $out.get(), true)
    newline()

print = () ->
    _represent(arguments, $out.get(), false)

println = () ->
    _represent(arguments, $out.get(), false)
    newline()

# reader

class Position
    constructor: (@offset, @line, @column, @origin) ->
        @offset ||= 0
        @line   ||= 1
        @column ||= 1
        @origin ||= "unknown origin"

    update: (c) ->
        if /[\n\r\f]/.test(c)
            new Position(@offset+1, @line+1, 1, @origin)
        else
            new Position(@offset+1, @line, @column+1, @origin)

    toString: () ->
        "at line #{@line}, column #{@column}, in #{@origin}"

class Reader
    constructor: (@input, @pos, @macros, @dispatchMacros) ->
        @input          ||= ""
        @pos            ||= new Position()
        @lastPos        ||= null
        @macros         ||= Reader.defaultMacros()
        @dispatchMacros ||= Reader.defaultDispatchMacros

    peekChar: () ->
        if @pos.offset < @input.length
            return @input[@pos.offset]
        else
            return Reader.EOF

    peekChars: (n) ->
        @input.substring(@pos.offset, @pos.offset+n)

    readChar: () ->
        c = @peekChar()
        if c != Reader.EOF
            @lastPos = @pos
            @pos = @pos.update(c)
        c

    readChars: (n) ->
        r = ""
        while n--
            c = @readChar()
            if c == Reader.EOF then raise('EOF')
            r += c
        return r

    readConstituents: () ->
        r = ""
        loop
            c = @peekChar()
            if c == Reader.EOF || /\s|;/.test(c) || @macros.contains(c) then return r
            r += @readChar()

    unreadChar: () ->
        @pos     = @lastPos
        @lastPos = null

    skipWhitespace: () ->
        inComment = false
        loop
            switch @readChar()
                when Reader.EOF then return
                when ' '  then null
                when '\t' then null
                when '\n' then inComment = false
                when '\r' then inComment = false
                when '\f' then inComment = false
                when ';'  then inComment = true
                else
                    if !inComment
                        @unreadChar()
                        return

    escape: (c) ->
        if c == 'u'
            code = @readChars(4)
            /[a-zA-Z0-9]{4}/.test(code) || raise('invalid unicode value: ' + code ' ' + @pos)
            return String.fromCharCode(parseInt(code, 16))
        else
            Reader.escapeMap[c] || raise('invalid escape character: ' + c + ' ' + @pos)


    readAllSexps: () ->
        sexps = []
        while !@isEmpty()
            sexps.push(@readSexp())
        sexps

    readSexp: () ->
        @skipWhitespace()
        c = @peekChar()
        if c == Reader.EOF
            return null
        macro = @macros.get(c)
        if macro
            return macro(this)
        return @readAtom()

    readAtom: () ->
        s = @readConstituents()
        if Reader.isFloat(s)  then return parseFloat(s)
        if Reader.isBinary(s) then return parseInt(s.substring(2), 2)
        if Reader.isOctal(s)  then return parseInt(s, 8)
        if Reader.isInt(s)    then return parseInt(s, 10)
        if Reader.isHex(s)    then return parseInt(s, 16)
        return Reader.parseAtom(s)

    isEmpty: () ->
        @skipWhitespace()
        @peekChar() == Reader.EOF

    @parseAtom: (s) ->
        if s[0] == ':'
            Keyword.create(s.substring(1))
        else
            new Symbol(s)

    @isBinary: (s) -> /(\+|-)?0[bB](0|1)+$/.test(s)
    @isOctal:  (s) -> /(\+|-)?0[0-7]+$/.test(s)
    @isInt:    (s) -> /(\+|-)?(0|([1-9][0-9]*))$/.test(s)
    @isHex:    (s) -> /(\+|-)?0[xX][0-9a-fA-F]+$/.test(s)
    @isFloat:  (s) -> /(\+|-)?(0|([1-9][0-9]*))\.[0-9]+$/.test(s)

    @escapeMap: {
        'n'  : '\n'
        'r'  : '\r'
        'f'  : '\f'
        'b'  : '\b'
        't'  : '\t'
        '"'  : '"'
        '\\' : '\\'
    }

    @readString: (r) ->
        chars = []
        pos   = @pos
        r.readChar()
        loop
            c = r.peekChar()
            if c == '\r' && r.peekChars(2) == '\r\n'
                r.readChars(2)
                chars.push('\n')
                continue
            switch c
                when Reader.EOF then raise('unclosed string literal ' + pos)
                when '"'  then r.readChar(); return chars.join('')

                when '\\' then r.readChar(); chars.push(r.escape(r.readChar()))
                else chars.push(r.readChar())
        r.readString()

    @EOF: {}

    @mismatchedDelimiter: (r) ->
        raise('unmatched delimiter ' + r.pos)

    @readList: (r) ->
        pos  = r.pos
        elts = []
        r.readChar()
        loop
            r.skipWhitespace()
            c = r.peekChar()
            switch c
                when ')' then r.readChar(); return List.fromArray(elts)
                when Reader.EOF then raise('unclosed list ' + pos)
                else elts.push(r.readSexp())

    @readArray: (r) ->
        pos  = r.pos
        elts = []
        r.readChar()
        loop
            r.skipWhitespace()
            c = r.peekChar()
            switch c
                when ']' then r.readChar(); return elts
                when Reader.EOF then raise('unclosed array ' + pos)
                else elts.push(r.readSexp())

    @readDict: (r) ->
        pos = r.pos
        elts = []
        r.readChar()
        loop
            r.skipWhitespace()
            c = r.peekChar()
            switch c
                when '}' then r.readChar(); return Dict.fromArray(elts)
                when Reader.EOF then raise('unclosed array ' + pos)
                else elts.push(r.readSexp())


    @readQuote:         (r) ->
        r.readChar()
        List.create(baseSymbol('quote'), r.readSexp())

    @readQuasiquote:    (r) ->
        r.readChar()
        List.create(baseSymbol('quasiquote'), r.readSexp())

    @readUnquote:       (r) ->
        r.readChar()
        if r.peekChar() == '@'
            r.readChar()
            prefix = baseSymbol('unquote-splicing')
        else
            prefix = baseSymbol('unquote')
        List.create(prefix, r.readSexp())

    @readDispatchMacro: (r) ->
        pos = r.pos
        r.readChar()
        c = r.peekChar()
        macro = r.dispatchMacros.get(c)
        if macro then macro(r) else raise('no dispatch macro for ' + c + ' ' + pos)

    @readQualifiedSymbol: (r) ->
        pos = r.pos
        r.readChar()
        ns = r.readConstituents()
        if r.readChar() != "#" then throw ('malformed qualifed symbol ' + pos)
        name = r.readConstituents()
        new Symbol(name, ns)

    @makeLiteralReader: (lit, val) ->
        (reader) ->
            s = reader.readChars(lit.length)
            if s == lit
                return val
            else
                raise("invalid dispatch macro: " + s)

    @defaultMacros: Dict.create(
        ')', Reader.mismatchedDelimiter,
        ']', Reader.mismatchedDelimiter,
        '}', Reader.mismatchedDelimiter,
        '(', Reader.readList,
        '[', Reader.readArray,
        '{', Reader.readDict,
        "'", Reader.readQuote,
        '"', Reader.readString,
        '`', Reader.readQuasiquote,
        ',', Reader.readUnquote,
        '#', Reader.readDispatchMacro
    )

    @defaultDispatchMacros: Dict.create(
        't', Reader.makeLiteralReader('t', true),
        'f', Reader.makeLiteralReader('f', false),
        'n', Reader.makeLiteralReader('nil', null),
        'v', Reader.makeLiteralReader('void', undefined),
        '#', Reader.readQualifiedSymbol
    )

    @create: (input, options) ->
        options ||= {}
        origin         = options.origin || null
        macros         = options.macros || Reader.defaultMacros
        dispatchMacros = options.dispatchMacros || Reader.defaultDispatchMacros
        position       =
        new Reader(input, new Position(null, null, null, origin), macros, dispatchMacros)


# expander and compiler
# make use of environments
# the former for resolving special-forms/macros
# the latter for eta renaming

class Env
    constructor: (@vars, @labels) ->
        @vars   ||= new Dict()
        @labels ||= new Dict()

    extend: () ->
        new Env(@vars.extend(), @labels.extend())

    get: (which, key) ->
        if key instanceof Symbol && key.namespace
            return Package.get(key.namespace).env.get(which, key.unqualify())
        env = this
        loop
            dict = env[which]
            val = dict.get(key)
            if val
                return val
            else if key instanceof Symbol && key.tags.size > 0
                env = key.tags.head.env
                key = key.untag()
            else
                return null

    getVar:    (x) -> @get('vars', x)
    getLabel:  (x) -> @get('labels', x)

    putVar: (x, y) ->
        @vars.put(x, y)

    putGlobal: (x) ->
        _x = $package.get().intern(x)
        @vars.put(x, _x)
        _x

    putLocal:  (x)  ->
        _x = if x instanceof Symbol then x.reify() else x
        @vars.put(x, _x)
        _x

    putLabel: (x, y)  ->
        y || = x
        if y instanceof Symbol then y = y.reify() else y
        @labels.put(x, y)
        y

    makeTag: ()  -> new Tag(this)

class Package
    constructor: (@name) ->
        @env       = new Env()
        @imports   = new Set()
        @exports   = new Set()
        @reexports = new Set()

    intern: (sym, val) ->
        rsym = sym.reify()
        qsym = val || new Symbol(rsym.name, @name)
        @env.putVar(rsym, qsym)
        @exports.put(rsym)
        return qsym

    toString: () -> @name

    @cache:  {}
    @exists: (name) -> Package.cache.hasOwnProperty(name)
    @get:    (name) -> Package.cache[name] ||= new Package(name)
    @load:   (name) ->
        if !@exists(name) then raise('Package.load not configured')
        @get(name)

$package.set(Package.get(basePackageName))

# compiler complex

# expander types

class Macro
    constructor: (@transformer) ->

    @create: (definingEnv, transformer) ->
        console.log(transformer.toString())
        _transformer = (callingEnv, input) ->
            tag = new Tag(definingEnv)

            sanitize = Macro.createSanitizer(tag)
            capture  = Macro.createCapturer(tag)
            compare  = Macro.createComparator(tag)

            input = sanitize(input)
            output = sanitize(transformer(input, capture, compare))
            console.log("transformed!")
            console.log(output)
            return output
        new Macro(_transformer)

    @walk = (f, x) ->
        walk = (x) ->
            if      x instanceof Symbol then f(x)
            else if x instanceof Array  then x.map(walk)
            else if x instanceof List   then List.fromArray(x.toArray().map(walk))
            else if x instanceof Dict   then Dict.fromArray(x.toArray().map(walk))
            else if x instanceof Set    then Set.fromArray(x.toArray().map(walk))
            else x
        walk(x)

    @createSanitizer = (t) ->
        (x) -> Macro.walk(((sym) -> sym.swapTag(t)), x)

    @createCapturer = (t) ->
        (x) -> Macro.walk(((sym) -> sym.ensureTag(t)), x)

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
            e.putLabel(x.head),
            expandBody(e, x.tail)
        )

    "loop" : (e, x) ->
        e = e.extend()
        e.putLabel(null)
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

    "let" : (e, x) ->
        vals = []
        vars = []

        pairs = x.head.toArray()

        for pair in pairs
            [_, expr] = pair.toArray()
            vals.push(expand(e, expr))

        e =  e.extend()

        for pair in pairs
            [name, _] = pair.toArray()
            vars.push(e.putLocal(name))

        bindings = []
        for v, i in vars
            bindings.push(List.fromArray([v, vals[i]]))

        List.create(
            baseSymbol("let"),
            List.fromArray(bindings),
            expandBody(e, x.tail)
        )

    "letrec" : (e, x) ->
      defs = x.head.toArray()
      for x, i in defs
        defs[i] = x.toArray()

      body = x.tail.toArray()
      expandLetRec(e, defs, body)

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
        for arg in x.head.toArray()
            args.push(e.putLocal(arg))
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
    if x == y then y else macroexpand(e, y)

expand = (e, x) ->
    x = macroexpand(e, x)
    switch true
        when x instanceof Symbol
            expandSymbol(e, x)
        when x instanceof List
            expandList(e, x)
        when x instanceof Array
            expandArray(e, x)
        when x instanceof Dict
            expandDict(e, x)
        when x instanceof Set
            expandSet(e, x)
        else
            x

expandSymbol = (e, x) ->
    val = e.getVar(x)
    if !val
        e.putGlobal(x)
    else if val instanceof Macro
        raise("can't take value of macro", x)
    else if val instanceof SpecialForm
        raise("can't take value of special form", x)
    else val

expandArray = (e, xs) ->
    for x in xs
        expand(e, x)

expandDict = (e, d) ->
    _d = new Dict()
    for [k, v] in d.toArray()
        _d.put(expand(e, k), expand(e, v))
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

    else if x instanceof Dict
      List.create(
        baseSymbol('from-array'),
        baseSymbol('Dict'),
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
    List.fromArray(x.toArray().map(_q)).cons(baseSymbol('concat'))

  q(x)

expandCall = (e, x) ->
    List.fromArray(expandArray(e, x.toArray()))

flattenBody = (e, xs) ->
    result = []
    loop
        if xs.length == 0
            return result
        else
            x = macroexpand(e, xs.shift())
            if isSpecialFormCall(e, x, "do")
                xs = x.tail.toArray().concat(xs)
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
    xs = xs.toArray()
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
          List.fromArray(rem).cons(baseSymbol("do"))

expandLetRec = (e, defs, body) ->
  e = e.extend()
  names    = []
  exprs    = []
  bindings = []

  for [name, _] in defs
    names.push(e.putLocal(name))

  for [_, expr] in defs
    exprs.push(expand(e, expr))

  for x, i in names
    bindings.push(List.create(x, exprs[i]))

  res = List.create(
    baseSymbol("letrec"),
    List.fromArray(bindings),
    expandBody(e, body)
  )

  #prn(res)

  res


# need to add special forms

do () ->
    p = Package.get(basePackageName)
    for k, v of SpecialForm.cache
        if SpecialForm.cache.hasOwnProperty(k)
            p.intern(new Symbol(k), v)

# begin normalizer

isSpecialFormSymbol = (x) ->
    x instanceof Symbol &&
    x.namespace == basePackageName &&
    SpecialForm.cache[x.name]

normalize = (x) ->
    if x instanceof List &&
       x.head instanceof Symbol &&
       Compiler.compilerMacros.contains(x.head)
        x = Compiler.compilerMacros.get(x.head)(x)
    postNormalize(x)

postNormalize = (x) ->
    if      x instanceof List    then normalizeList(x.toArray())
    else if x instanceof Array   then ['ARRAY', _normalize(x)]
    else if x instanceof Dict    then ['DICT', x.toArray().map(normalize)]
    else if x instanceof Symbol
        if x.namespace
            ['GLOBAL', x.namespace, x.name]
        else
            ['VAR', x.name]
    else if x instanceof Keyword then ['KEYWORD', x]
    else ['VAL', x]

_normalize = (xs) ->
    for x in xs
        normalize(x)

baseGlobal = (name) ->
    ['GLOBAL', basePackageName, name]

normalizeQuote = (x) ->
    if x instanceof Symbol
        ['NEW', baseGlobal('Symbol'), [['VAL', x.name], ['VAL', x.namespace]]]
    else if x instanceof List
        ['CALL', baseGlobal('list'), _normalizeQuote(x.toArray())]
    else if x instanceof Array
        ['ARRAY', _normalizeQuote(x)]
    else if x instanceof Dict
        ['DICT', _normalizeQuote(x.toArray())]
    else
        ['VAL', x]

_normalizeQuote = (xs) ->
    for x in xs
        normalizeQuote(x)

normalizeCall = (x) ->
    ['CALL', normalize(x[0]), _normalize(x.slice(1))]

normalizeBindings = (xs) ->
    xs = xs.toArray()
    ys = []
    for x in xs
        x = x.toArray()
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
            when 'throw'
                ['THROW', normalize(x[1]), normalize(x[2])]
            when 'fn*'
                node = ['FUNCTION',
                        _normalize(x[1].toArray()),
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
        @env   ||= new Env()
        @scope ||= new Scope(0)
        @block ||= []

    extendEnv: (env) ->
        new Compiler(env || @env.extend(), @scope, @block)

    extendBlock: (block) ->
        new Compiler(@env, @scope, block || [])

    extendScope: () ->
        new Compiler(@env.extend(), new Scope(@scope.level + 1), [])

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
         @env.getVar(v)

    getLabel: (l) ->
        @env.getLabel(l)

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
        @env.putVar(name, local)
        local

    bindLabel: (name, data) ->
        @env.putLabel(name, data)

    bindArgs: (args) ->
        _args = []
        for a, i in args
            _a = ['ARG', @scope.level, i]
            @env.putVar(a, _a)
            _args.push(_a)
        _args

    bindException: (name) ->
        exception = @makeException()
        @env.putVar(name, exception)
        exception

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
            @push(['THROW', ['VAL', null]])

    compileControlStructure: (tag, labelName, body, tracer) ->
        compiler = @extendEnv()
        sentinel = null
        getter   = (() -> sentinel || sentinel = compiler.makeLocal())
        label    = compiler.makeLabel()
        compiler.bindLabel(labelName, [label, tracer, getter])

        body     = compiler.compileBlock(body, tracer)
        if sentinel
          body.unshift(['SET!', sentinel, false])
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

    @compilerMacros: new Dict()

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
            if c[0][0] == 'IF' && c.length == 1
                @emit(c[0])
            else
                @p(" else ")
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

            else
                raise("[BUG] invalid tag sent to emitter " + tag)

        this

    @emitToplevel: (toplevel) ->
        new Emitter().emitBlock(toplevel).toString()

#$package.set(Package.get("test"))

ev = (body) ->
    func = Function(['RT'], body)
    func(RT)

bootstrap = (packageName, object) ->
    pkg = Package.get(packageName)

    for k, v of object
        if object.hasOwnProperty(k)
            RT[packageName + "#" + k] = v
            pkg.intern(new Symbol(k))

# bootstrap our starting environment

bootstrap("gandalf", {
    "+" : (x, y) ->
        switch arguments.length
            when 0 then 0
            when 1 then x
            when 2 then x + y
            else
                r = x + y
                i = 2
                while i < arguments.length
                    r = r + arguments[i++]
                r

    "*" : (x, y) ->
        switch arguments.length
            when 0 then 1
            when 1 then x
            when 2 then x * y
            else
                r = x * y
                i = 2
                while i < arguments.length
                    r = r * arguments[i++]
                r

    "-" : (x, y) ->
        switch arguments.length
            when 0 then raise("- requires at least one argument")
            when 1 then -x
            when 2 then x - y
            else
                r = x - y
                i = 2
                while i < arguments.length
                    r = r - arguments[i++]
                r

    "/" : (x, y) ->
        switch arguments.length
            when 0 then raise("/ requires at least one argument")
            when 1 then 1/x
            when 2 then x/y
            else
                r = x / y
                i = 2
                while i < arguments.length
                    r = r * arguments[i++]
                r

    "<"   : (x, y) -> x < y
    ">"   : (x, y) -> x > y
    "<="  : (x, y) -> x <= y
    ">="  : (x, y) -> x >= y
    "eq?" : (x, y) -> x == y

    "div" : (x, y) -> ~~(x/y)
    "mod" : (x, y) -> x % y

    "bit-or"  : (x, y) -> x | y
    "bit-and" : (x, y) -> x & y
    "bit-xor" : (x, y) -> x ^ y
    "bit-not" : (x) -> ~x

    "bit-shift-left"   : (x, y) -> x << y
    "bit-shift-right"  : (x, y) -> x >> y
    "bit-shift-right*" : (x, y) -> x >>> y

    "typeof"        : (x)    -> typeof x
    "instance?"     : (x, y) -> x instanceof y
    "has-property?" : (x, y) -> y in x

    "Boolean"     : Boolean
    "String"      : String
    "Number"      : Number
    "Array"       : Array
    "Object"      : Object
    "RegExp"      : RegExp

    "Symbol"      : Symbol
    "Keyword"     : Keyword
    "List"        : List
    "Dict"        : Dict
    "Set"         : Set

    "list"        : List.create
    "array"       : () -> for x in arguments then x
    "dict"        : Dict.create
    "set"         : Set.create
    "cons"        : (x, y) -> y.cons(x)
    "to-array"    : (x) -> x.toArray()
    "from-array"  : (type, array) -> type.fromArray(array)

    "represent"   : represent
    "pr"          : pr
    "prn"         : prn
    "print"       : print
    "println"     : println

    "Env"         : Env
    "Compiler"    : Compiler
    "Emitter"     : Emitter

    "*out*"       : $out.get()
    "*package*"   : $package.get()

    "require"     : require
    "process"     : process
    "js"          : global

    "*echo*"           : false
    "*echo:expand*"    : false
    "*echo:normalize*" : false
    "*echo:compile*"   : false
    "*echo:emit*"      : false
    "*echo:eval*"      : false

    "concat" : () ->
      switch arguments.length
        when 0 then []
        when 1 then arguments[0].toArray()
        else
          idx  = arguments.length-1
          tail = arguments[idx].toArray()
          while idx--
            cat(arguments[idx].toArray(), tail)
          tail

})

cat = (x, y) ->
  x = x.toArray()
  i = x.length
  while i--
    y.unshift(x[i])
  y

bootstrap("gandalf", Math)

$echo           = new Ref(RT, basePackageName + "#*echo*")
$echo_sexp      = new Ref(RT, basePackageName + "#*echo:sexp*")
$echo_expand    = new Ref(RT, basePackageName + "#*echo:expand*")
$echo_normalize = new Ref(RT, basePackageName + "#*echo:normalize*")
$echo_compile   = new Ref(RT, basePackageName + "#*echo:compile*")
$echo_emit      = new Ref(RT, basePackageName + "#*echo:emit*")
$echo_eval      = new Ref(RT, basePackageName + "#*echo:eval*")

expandAndEval = (env, sexp) ->
    if $echo_sexp.get() then prn(sexp)

    a = expand(env, sexp)
    if $echo_expand.get() then prn(a)

    b = normalize(a)
    if $echo_normalize.get() then prn(b)

    c = Compiler.compileToplevel(b)
    if $echo_compile.get() then prn(c)

    d = Emitter.emitToplevel(c)
    if $echo_emit.get() then println(d)

    e = ev(d)
    if $echo_eval.get() then prn(e)

    if $echo.get() then prn()

    return e

loadToplevel = (reader) ->
    pkg     = $package.get()
    env     = pkg.env
    sexps   = []
    result  = null

    expand1 = (sexp) ->
        if isSpecialFormCall(env, sexp, "do")
            sexps = sexp.tail.toArray().concat(sexps)

        else if isSpecialFormCall(env, sexp, "import")
            raise('not implemented')

        else if isSpecialFormCall(env, sexp, "include")
            raise('not implemented')

        else if isSpecialFormCall(env, sexp, "define*")
            _sexp = sexp.tail.cons(baseSymbol("set!"))
            result = expandAndEval(env, _sexp)

        else if isSpecialFormCall(env, sexp, "define-macro*")
            transformer = expandAndEval(env, sexp.tail.tail.head)
            pkg.intern(sexp.tail.head, Macro.create(env, transformer))

        else
            result = expandAndEval(env, sexp)

    while !reader.isEmpty()
        sexp = reader.readSexp()
        sexps.push(sexp)
        while sexps.length > 0
            expand1(sexps.shift())

    return result

fs   = require('fs')
path = require('path')
util = require('util')

p = (x) -> console.log(util.inspect(x, false, null))

loadFile = (filename) ->
    file         = fs.readFileSync(filename, 'utf8')
    reader       = Reader.create(file, filename)
    loadToplevel(reader)

loadFile("scratch.gandalf")
