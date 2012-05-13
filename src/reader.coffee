# reader

# might be worthwhile rewriting all methods on
# the reader object into class methods to make
# them easier to call from compiled code

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
    constructor: (input, pos, macros, dispatchMacros) ->
      if !(this instanceof Reader)
        return new Reader(input, pos, macros, dispatchMacros)
      else
        @input          = input || ""
        @pos            = pos || new Position()
        @lastPos        = null
        @macros         = macros || Reader.defaultMacros
        @dispatchMacros = dispatchMacros || Reader.defaultDispatchMacros

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
            if c == Reader.EOF || /\s|;/.test(c) || contains(@macros, c) then return r
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
        macro = get(@macros, c)
        if macro then macro(this) else @readAtom()

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

    @dottedRegex: /^[^\.]+(\.[^\.]+)+/

    @parseAtom: (s) ->
      if Reader.dottedRegex.test(s)
        segs = s.split(".")
        root = new Symbol(segs[0])
        for seg in segs.slice(1)
          root = List.create(baseSymbol('.'), root, seg)
        root
      else
        new Symbol(s)

    @isBinary: (s) -> /^(\+|-)?0[bB](0|1)+$/.test(s)
    @isOctal:  (s) -> /^(\+|-)?0[0-7]+$/.test(s)
    @isInt:    (s) -> /^(\+|-)?(0|([1-9][0-9]*))$/.test(s)
    @isHex:    (s) -> /^(\+|-)?0[xX][0-9a-fA-F]+$/.test(s)
    @isFloat:  (s) -> /^(\+|-)?(0|([1-9][0-9]*))\.[0-9]+$/.test(s)

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
        macro = get(r.dispatchMacros, c)
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

    @defaultMacros: Map.create(
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

    @defaultDispatchMacros: Map.create(
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
