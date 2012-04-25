var Position, Reader;
Position = (function() {
  function Position(offset, line, column, origin) {
    this.offset = offset;
    this.line = line;
    this.column = column;
    this.origin = origin;
    this.offset || (this.offset = 0);
    this.line || (this.line = 1);
    this.column || (this.column = 1);
    this.origin || (this.origin = "unknown origin");
  }
  Position.prototype.update = function(c) {
    if (/[\n\r\f]/.test(c)) {
      return new Position(this.offset + 1, this.line + 1, 1, this.origin);
    } else {
      return new Position(this.offset + 1, this.line, this.column + 1, this.origin);
    }
  };
  Position.prototype.toString = function() {
    return "at line " + this.line + ", column " + this.column + ", in " + this.origin;
  };
  return Position;
})();
Reader = (function() {
  function Reader(input, pos, macros, dispatchMacros) {
    if (!(this instanceof Reader)) {
      return new Reader(input, pos, macros, dispatchMacros);
    } else {
      this.input = input || "";
      this.pos = pos || new Position();
      this.lastPos = null;
      this.macros = macros || Reader.defaultMacros;
      this.dispatchMacros = dispatchMacros || Reader.defaultDispatchMacros;
    }
  }
  Reader.prototype.peekChar = function() {
    if (this.pos.offset < this.input.length) {
      return this.input[this.pos.offset];
    } else {
      return Reader.EOF;
    }
  };
  Reader.prototype.peekChars = function(n) {
    return this.input.substring(this.pos.offset, this.pos.offset + n);
  };
  Reader.prototype.readChar = function() {
    var c;
    c = this.peekChar();
    if (c !== Reader.EOF) {
      this.lastPos = this.pos;
      this.pos = this.pos.update(c);
    }
    return c;
  };
  Reader.prototype.readChars = function(n) {
    var c, r;
    r = "";
    while (n--) {
      c = this.readChar();
      if (c === Reader.EOF) {
        raise('EOF');
      }
      r += c;
    }
    return r;
  };
  Reader.prototype.readConstituents = function() {
    var c, r, _results;
    r = "";
    _results = [];
    while (true) {
      c = this.peekChar();
      if (c === Reader.EOF || /\s|;/.test(c) || contains(this.macros, c)) {
        return r;
      }
      _results.push(r += this.readChar());
    }
    return _results;
  };
  Reader.prototype.unreadChar = function() {
    this.pos = this.lastPos;
    return this.lastPos = null;
  };
  Reader.prototype.skipWhitespace = function() {
    var inComment, _results;
    inComment = false;
    _results = [];
    while (true) {
      switch (this.readChar()) {
        case Reader.EOF:
          return;
        case ' ':
          null;
          break;
        case '\t':
          null;
          break;
        case '\n':
          inComment = false;
          break;
        case '\r':
          inComment = false;
          break;
        case '\f':
          inComment = false;
          break;
        case ';':
          inComment = true;
          break;
        default:
          if (!inComment) {
            this.unreadChar();
            return;
          }
      }
    }
    return _results;
  };
  Reader.prototype.escape = function(c) {
    var code;
    if (c === 'u') {
      code = this.readChars(4);
      /[a-zA-Z0-9]{4}/.test(code) || raise('invalid unicode value: ' + code(' ' + this.pos));
      return String.fromCharCode(parseInt(code, 16));
    } else {
      return Reader.escapeMap[c] || raise('invalid escape character: ' + c + ' ' + this.pos);
    }
  };
  Reader.prototype.readAllSexps = function() {
    var sexps;
    sexps = [];
    while (!this.isEmpty()) {
      sexps.push(this.readSexp());
    }
    return sexps;
  };
  Reader.prototype.readSexp = function() {
    var c, macro;
    this.skipWhitespace();
    c = this.peekChar();
    if (c === Reader.EOF) {
      return null;
    }
    macro = get(this.macros, c);
    if (macro) {
      return macro(this);
    } else {
      return this.readAtom();
    }
  };
  Reader.prototype.readAtom = function() {
    var s;
    s = this.readConstituents();
    if (Reader.isFloat(s)) {
      return parseFloat(s);
    }
    if (Reader.isBinary(s)) {
      return parseInt(s.substring(2), 2);
    }
    if (Reader.isOctal(s)) {
      return parseInt(s, 8);
    }
    if (Reader.isInt(s)) {
      return parseInt(s, 10);
    }
    if (Reader.isHex(s)) {
      return parseInt(s, 16);
    }
    return Reader.parseAtom(s);
  };
  Reader.prototype.isEmpty = function() {
    this.skipWhitespace();
    return this.peekChar() === Reader.EOF;
  };
  Reader.dottedRegex = /^[^\.]+(\.[^\.]+)+/;
  Reader.parseAtom = function(s) {
    var root, seg, segs, _i, _len, _ref;
    if (Reader.dottedRegex.test(s)) {
      segs = s.split(".");
      root = new Symbol(segs[0]);
      _ref = segs.slice(1);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        seg = _ref[_i];
        root = List.create(baseSymbol('.'), root, seg);
      }
      return root;
    } else {
      return new Symbol(s);
    }
  };
  Reader.isBinary = function(s) {
    return /(\+|-)?0[bB](0|1)+$/.test(s);
  };
  Reader.isOctal = function(s) {
    return /(\+|-)?0[0-7]+$/.test(s);
  };
  Reader.isInt = function(s) {
    return /(\+|-)?(0|([1-9][0-9]*))$/.test(s);
  };
  Reader.isHex = function(s) {
    return /(\+|-)?0[xX][0-9a-fA-F]+$/.test(s);
  };
  Reader.isFloat = function(s) {
    return /(\+|-)?(0|([1-9][0-9]*))\.[0-9]+$/.test(s);
  };
  Reader.escapeMap = {
    'n': '\n',
    'r': '\r',
    'f': '\f',
    'b': '\b',
    't': '\t',
    '"': '"',
    '\\': '\\'
  };
  Reader.readString = function(r) {
    var c, chars, pos;
    chars = [];
    pos = this.pos;
    r.readChar();
    while (true) {
      c = r.peekChar();
      if (c === '\r' && r.peekChars(2) === '\r\n') {
        r.readChars(2);
        chars.push('\n');
        continue;
      }
      switch (c) {
        case Reader.EOF:
          raise('unclosed string literal ' + pos);
          break;
        case '"':
          r.readChar();
          return chars.join('');
        case '\\':
          r.readChar();
          chars.push(r.escape(r.readChar()));
          break;
        default:
          chars.push(r.readChar());
      }
    }
    return r.readString();
  };
  Reader.EOF = {};
  Reader.mismatchedDelimiter = function(r) {
    return raise('unmatched delimiter ' + r.pos);
  };
  Reader.readList = function(r) {
    var c, elts, pos, _results;
    pos = r.pos;
    elts = [];
    r.readChar();
    _results = [];
    while (true) {
      r.skipWhitespace();
      c = r.peekChar();
      switch (c) {
        case ')':
          r.readChar();
          return List.fromArray(elts);
        case Reader.EOF:
          raise('unclosed list ' + pos);
          break;
        default:
          elts.push(r.readSexp());
      }
    }
    return _results;
  };
  Reader.readArray = function(r) {
    var c, elts, pos, _results;
    pos = r.pos;
    elts = [];
    r.readChar();
    _results = [];
    while (true) {
      r.skipWhitespace();
      c = r.peekChar();
      switch (c) {
        case ']':
          r.readChar();
          return elts;
        case Reader.EOF:
          raise('unclosed array ' + pos);
          break;
        default:
          elts.push(r.readSexp());
      }
    }
    return _results;
  };
  Reader.readDict = function(r) {
    var c, elts, pos, _results;
    pos = r.pos;
    elts = [];
    r.readChar();
    _results = [];
    while (true) {
      r.skipWhitespace();
      c = r.peekChar();
      switch (c) {
        case '}':
          r.readChar();
          return Dict.fromArray(elts);
        case Reader.EOF:
          raise('unclosed array ' + pos);
          break;
        default:
          elts.push(r.readSexp());
      }
    }
    return _results;
  };
  Reader.readQuote = function(r) {
    r.readChar();
    return List.create(baseSymbol('quote'), r.readSexp());
  };
  Reader.readQuasiquote = function(r) {
    r.readChar();
    return List.create(baseSymbol('quasiquote'), r.readSexp());
  };
  Reader.readUnquote = function(r) {
    var prefix;
    r.readChar();
    if (r.peekChar() === '@') {
      r.readChar();
      prefix = baseSymbol('unquote-splicing');
    } else {
      prefix = baseSymbol('unquote');
    }
    return List.create(prefix, r.readSexp());
  };
  Reader.readDispatchMacro = function(r) {
    var c, macro, pos;
    pos = r.pos;
    r.readChar();
    c = r.peekChar();
    macro = get(r.dispatchMacros, c);
    if (macro) {
      return macro(r);
    } else {
      return raise('no dispatch macro for ' + c + ' ' + pos);
    }
  };
  Reader.readQualifiedSymbol = function(r) {
    var name, ns, pos;
    pos = r.pos;
    r.readChar();
    ns = r.readConstituents();
    if (r.readChar() !== "#") {
      throw 'malformed qualifed symbol ' + pos;
    }
    name = r.readConstituents();
    return new Symbol(name, ns);
  };
  Reader.makeLiteralReader = function(lit, val) {
    return function(reader) {
      var s;
      s = reader.readChars(lit.length);
      if (s === lit) {
        return val;
      } else {
        return raise("invalid dispatch macro: " + s);
      }
    };
  };
  Reader.defaultMacros = Map.create(')', Reader.mismatchedDelimiter, ']', Reader.mismatchedDelimiter, '}', Reader.mismatchedDelimiter, '(', Reader.readList, '[', Reader.readArray, '{', Reader.readDict, "'", Reader.readQuote, '"', Reader.readString, '`', Reader.readQuasiquote, ',', Reader.readUnquote, '#', Reader.readDispatchMacro);
  Reader.defaultDispatchMacros = Map.create('t', Reader.makeLiteralReader('t', true), 'f', Reader.makeLiteralReader('f', false), 'n', Reader.makeLiteralReader('nil', null), 'v', Reader.makeLiteralReader('void', void 0), '#', Reader.readQualifiedSymbol);
  Reader.create = function(input, options) {
    var dispatchMacros, macros, origin, position;
    options || (options = {});
    origin = options.origin || null;
    macros = options.macros || Reader.defaultMacros;
    dispatchMacros = options.dispatchMacros || Reader.defaultDispatchMacros;
    return position = new Reader(input, new Position(null, null, null, origin), macros, dispatchMacros);
  };
  return Reader;
})();