var Compiler, Emitter, Scope, baseGlobal, isSpecialFormSymbol, normalize, normalizeBindings, normalizeCall, normalizeList, normalizeQuote, postNormalize, _normalize, _normalizeQuote;
isSpecialFormSymbol = function(x) {
  return x instanceof Symbol && x.ns === baseNS && SpecialForm.cache[x.name];
};
normalize = function(x) {
  if (x instanceof List && x.head instanceof Symbol && contains($COMPILER_MACROS(), x.head)) {
    x = get($COMPILER_MACROS(), x.head)(x);
  }
  return postNormalize(x);
};
postNormalize = function(x) {
  if (x instanceof List) {
    return normalizeList(toArray(x));
  } else if (x instanceof Array) {
    return ['ARRAY', _normalize(x)];
  } else if (x instanceof Symbol) {
    if (x.ns) {
      return ['GLOBAL', x.ns, x.name];
    } else {
      return ['VAR', x.name];
    }
  } else {
    return ['VAL', x];
  }
};
_normalize = function(xs) {
  var x, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = xs.length; _i < _len; _i++) {
    x = xs[_i];
    _results.push(normalize(x));
  }
  return _results;
};
baseGlobal = function(name) {
  return ['GLOBAL', baseNS, name];
};
normalizeQuote = function(x) {
  if (x instanceof Symbol) {
    return ['NEW', baseGlobal('Symbol'), [['VAL', x.name], ['VAL', x.ns]]];
  } else if (x instanceof List) {
    return ['CALL', baseGlobal('list'), _normalizeQuote(toArray(x))];
  } else if (x instanceof Array) {
    return ['ARRAY', _normalizeQuote(x)];
  } else {
    return ['VAL', x];
  }
};
_normalizeQuote = function(xs) {
  var x, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = xs.length; _i < _len; _i++) {
    x = xs[_i];
    _results.push(normalizeQuote(x));
  }
  return _results;
};
normalizeCall = function(x) {
  return ['CALL', normalize(x[0]), _normalize(x.slice(1))];
};
normalizeBindings = function(xs) {
  var x, y, _i, _len, _ref, _results;
  _results = [];
  for (_i = 0, _len = xs.length; _i < _len; _i++) {
    _ref = xs[_i], x = _ref[0], y = _ref[1];
    _results.push([normalize(x), normalize(y)]);
  }
  return _results;
};
normalizeList = function(x) {
  var args, callee, node, _, _ref;
  if (isSpecialFormSymbol(x[0])) {
    switch (x[0].name) {
      case 'do':
        return ['DO', _normalize(x.slice(1))];
      case 'if':
        return ['IF', normalize(x[1]), normalize(x[2]), normalize(x[3])];
      case 'let*':
        return ['LET', normalizeBindings(x[1]), normalize(x[2])];
      case 'letrec*':
        return ['LETREC', normalizeBindings(x[1]), normalize(x[2])];
      case 'set!':
        return ['SET!', normalize(x[1]), normalize(x[2])];
      case '.':
        return ['FIELD', normalize(x[1]), normalize(x[2])];
      case 'block':
        return ['BLOCK', normalize(x[1]), normalize(x[2])];
      case 'loop':
        return ['LOOP', normalize(x[1])];
      case 'return-from':
        return ['RETURN_FROM', normalize(x[1]), normalize(x[2])];
      case 'new':
        _ref = normalizeCall(x.slice(1)), _ = _ref[0], callee = _ref[1], args = _ref[2];
        return ['NEW', callee, args];
      case 'throw':
        return ['THROW', normalize(x[1]), normalize(x[2])];
      case 'fn*':
        node = ['FUNCTION', _normalize(toArray(x[1])), normalize(x[2])];
        return node;
      case 'js*':
        return ['RAW', x[1]];
      case 'quote':
        return normalizeQuote(x[1]);
      default:
        return raise('[BUG] no normalize clause for special-form: ' + x[0].name);
    }
  } else {
    return normalizeCall(x);
  }
};
Scope = (function() {
  function Scope(level) {
    this.level = level;
    this.level || (this.level = 0);
    this.numLocals = 0;
    this.numLabels = 0;
    this.numExceptions = 0;
  }
  return Scope;
})();
Compiler = (function() {
  function Compiler(env, scope, block) {
    this.env = env;
    this.scope = scope;
    this.block = block;
    this.env || (this.env = new Map());
    this.scope || (this.scope = new Scope(0));
    this.block || (this.block = []);
  }
  Compiler.prototype.extendEnv = function() {
    return new Compiler(Map.extend(this.env), this.scope, this.block);
  };
  Compiler.prototype.extendBlock = function(block) {
    return new Compiler(this.env, this.scope, block || []);
  };
  Compiler.prototype.extendScope = function() {
    return new Compiler(Map.extend(this.env), new Scope(this.scope.level + 1), []);
  };
  Compiler.prototype.callWithBlock = function(thunk) {
    var c;
    c = this.extendBlock();
    thunk();
    return c.block;
  };
  Compiler.prototype.finalize = function() {
    var i, vs;
    if (this.scope.numLocals > 0) {
      i = 0;
      vs = [];
      while (i < this.scope.numLocals) {
        vs.push(['LOCAL', this.scope.level, i]);
        i++;
      }
      return this.block.unshift(['DECLARE', vs]);
    }
  };
  Compiler.prototype.push = function(x, t) {
    if (t) {
      x = t(x);
    }
    this.block.push(x);
    return null;
  };
  Compiler.prototype.maybePush = function(x, t) {
    if (t) {
      this.push(x, t);
    }
    return null;
  };
  Compiler.prototype.getVar = function(v) {
    return get(this.env, v);
  };
  Compiler.prototype.getLabel = function(l) {
    return get(this.env, ['LABEL', l]);
  };
  Compiler.prototype.makeLocal = function() {
    var id;
    id = this.scope.numLocals++;
    return ['LOCAL', this.scope.level, id];
  };
  Compiler.prototype.makeLabel = function() {
    var id;
    id = this.scope.numLabels++;
    return ['LABEL', this.scope.level, id];
  };
  Compiler.prototype.makeException = function() {
    var id;
    id = this.scope.numExceptions++;
    return ['EXCEPTION', this.scope.level, id];
  };
  Compiler.prototype.bindLocal = function(name) {
    var local;
    local = this.makeLocal();
    put(this.env, name, local);
    return local;
  };
  Compiler.prototype.bindLabel = function(name, data) {
    put(this.env, ['LABEL', name], data);
    return data;
  };
  Compiler.prototype.bindException = function(name) {
    var exception;
    exception = this.makeException();
    put(this.env, name, exception);
    return exception;
  };
  Compiler.prototype.bindArgs = function(args) {
    var a, i, _a, _args, _len;
    _args = [];
    for (i = 0, _len = args.length; i < _len; i++) {
      a = args[i];
      _a = ['ARG', this.scope.level, i];
      put(this.env, a, _a);
      _args.push(_a);
    }
    return _args;
  };
  Compiler.prototype.serializeToAtom = function(x) {
    var a, b, c, tag, v;
    tag = x[0], a = x[1], b = x[2], c = x[3];
    switch (tag) {
      case 'VAL':
        return x;
      case 'VAR':
        return this.getVar(x);
      case 'GLOBAL':
        return x;
      default:
        v = this.makeLocal();
        this.compile(x, Compiler.tracerFor(v));
        return v;
    }
  };
  Compiler.prototype._serialize = function(xs) {
    var x, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = xs.length; _i < _len; _i++) {
      x = xs[_i];
      _results.push(this.serialize(x));
    }
    return _results;
  };
  Compiler.prototype.serialize = function(x) {
    var a, b, c, tag, v;
    tag = x[0], a = x[1], b = x[2], c = x[3];
    switch (tag) {
      case 'VAR':
        return this.getVar(x);
      case 'RAW':
        return x;
      case 'VAL':
        return x;
      case 'GLOBAL':
        return x;
      case 'FIELD':
        return ['FIELD', this.serialize(a), this.serialize(b)];
      case 'CALL':
        return ['CALL', this.serialize(a), this._serialize(b)];
      case 'NEW':
        return ['NEW', this.serialize(a), this._serialize(b)];
      case 'THROW':
        this.compile(x);
        return ['VAL', null];
      case 'RETURN_FROM':
        this.compile(x);
        return ['VAL', null];
      case 'SET!':
        a = this.serialize(a);
        this.compile(b, Compiler.tracerFor(a));
        return a;
      default:
        v = this.makeLocal();
        this.compile(x, Compiler.tracerFor(v));
        return v;
    }
  };
  Compiler.prototype.compileDo = function(xs, t) {
    var e, i;
    if (xs.length === 0) {
      return this.compile(['VAL', null], t);
    } else {
      i = 0;
      e = xs.length - 1;
      while (i < e) {
        this.compile(xs[i]);
        i++;
      }
      return this.compile(xs[i], t);
    }
  };
  Compiler.prototype.compileLet = function(pairs, body, tracer) {
    var compiler, v, x, _compiler, _i, _len, _ref, _v;
    compiler = this;
    for (_i = 0, _len = pairs.length; _i < _len; _i++) {
      _ref = pairs[_i], v = _ref[0], x = _ref[1];
      _compiler = compiler.extendEnv();
      _v = _compiler.bindLocal(v);
      compiler.compile(x, Compiler.tracerFor(_v));
      compiler = _compiler;
    }
    return compiler.compile(body, tracer);
  };
  Compiler.prototype.compileLetRec = function(pairs, body, tracer) {
    var v, x, _compiler, _i, _j, _len, _len2, _pairs, _ref, _ref2, _v;
    _compiler = this.extendEnv();
    _pairs = [];
    for (_i = 0, _len = pairs.length; _i < _len; _i++) {
      _ref = pairs[_i], v = _ref[0], x = _ref[1];
      _v = _compiler.bindLocal(v);
      _pairs.push([_v, x]);
    }
    for (_j = 0, _len2 = _pairs.length; _j < _len2; _j++) {
      _ref2 = _pairs[_j], v = _ref2[0], x = _ref2[1];
      _compiler.compile(x, Compiler.tracerFor(v));
    }
    return _compiler.compile(body, tracer);
  };
  Compiler.prototype.compileFunction = function(args, body, tracer) {
    var c, node, ret;
    c = this.extendScope();
    ret = c.makeLocal();
    args = c.bindArgs(args);
    c.compile(body, Compiler.tracerFor(ret));
    c.push(['RETURN', ret]);
    c.finalize();
    node = ['FUNCTION', args, c.block];
    return this.maybePush(node, tracer);
  };
  Compiler.prototype.compileReturnFrom = function(labelName, value) {
    var label, level, sentinelGetter, tracer, _ref;
    _ref = this.getLabel(labelName), label = _ref[0], tracer = _ref[1], sentinelGetter = _ref[2];
    level = label[1];
    this.compile(value, tracer);
    if (level === this.scope.level) {
      return this.push(['BREAK', label]);
    } else {
      this.push(['SET!', sentinelGetter(), ['VAL', false]]);
      return this.push(['THROW', ['VAL', 'NON_LOCAL_EXIT']]);
    }
  };
  Compiler.prototype.compileControlStructure = function(tag, labelName, body, tracer) {
    var compiler, getter, label, sentinel;
    compiler = this.extendEnv();
    sentinel = null;
    getter = (function() {
      return sentinel || (sentinel = compiler.makeLocal());
    });
    label = compiler.makeLabel();
    compiler.bindLabel(labelName, [label, tracer, getter]);
    body = compiler.compileBlock(body, tracer);
    if (sentinel) {
      body.unshift(['SET!', sentinel, ['VAL', true]]);
    }
    return this.push([tag, sentinel, label, body]);
  };
  Compiler.prototype.compileBlock = function(x, t) {
    var c;
    c = this.extendBlock();
    c.compile(x, t);
    return c.block;
  };
  Compiler.prototype.compile = function(x, t) {
    var a, b, c, tag;
    tag = x[0], a = x[1], b = x[2], c = x[3];
    switch (tag) {
      case 'RAW':
        return this.push(x, t);
      case 'VAR':
        return this.maybePush(this.getVar(x), t);
      case 'VAL':
        return this.maybePush(x, t);
      case 'GLOBAL':
        return this.maybePush(x, t);
      case 'ARRAY':
        return this.maybePush(['ARRAY', this._serialize(a)], t);
      case 'FIELD':
        return this.maybePush(this.serialize(x), t);
      case 'CALL':
        return this.push(this.serialize(x), t);
      case 'NEW':
        return this.push(this.serialize(x), t);
      case 'THROW':
        return this.push(['THROW', this.serialize(a)]);
      case 'DO':
        return this.compileDo(a, t);
      case 'BLOCK':
        return this.compileControlStructure('BLOCK', a, b, t);
      case 'LOOP':
        return this.compileControlStructure('LOOP', ['VAL', null], a, t);
      case 'LET':
        return this.compileLet(a, b, t);
      case 'LETREC':
        return this.compileLetRec(a, b, t);
      case 'RETURN_FROM':
        return this.compileReturnFrom(a, b);
      case 'FUNCTION':
        return this.compileFunction(a, b, t);
      case 'IF':
        a = this.serializeToAtom(a);
        b = this.compileBlock(b, t);
        c = this.compileBlock(c, t);
        return this.push(['IF', a, b, c]);
      case 'SET!':
        a = this.serialize(a);
        this.compile(b, Compiler.tracerFor(a));
        return this.maybePush(a, t);
      default:
        return raise('[BUG] unhandled tag in compile ' + tag);
    }
  };
  Compiler.tracerFor = function(location) {
    return function(value) {
      return ['SET!', location, value];
    };
  };
  Compiler.compileToplevel = function(x) {
    var c, ret;
    c = new Compiler();
    ret = c.makeLocal();
    c.compile(x, Compiler.tracerFor(ret));
    c.finalize();
    c.push(['RETURN', ret]);
    return c.block;
  };
  Compiler.compilerMacros = new Map();
  return Compiler;
})();
Emitter = (function() {
  function Emitter(buffer, indentSize) {
    this.buffer = buffer;
    this.indentSize = indentSize;
    this.buffer || (this.buffer = []);
    this.indentSize || (this.indentSize = 4);
    this.indention = 0;
  }
  Emitter.prototype.toString = function() {
    return this.buffer.join("");
  };
  Emitter.prototype.indent = function() {
    return this.indention += this.indentSize;
  };
  Emitter.prototype.unindent = function() {
    return this.indention -= this.indentSize;
  };
  Emitter.prototype.emitGlobal = function(a, b) {
    return this.p("RT[\"" + a + "#" + b + "\"]");
  };
  Emitter.prototype.emitLocal = function(a, b) {
    return this.p("x_" + a + "_" + b);
  };
  Emitter.prototype.emitLabel = function(a, b) {
    return this.p("block_" + a + "_" + b);
  };
  Emitter.prototype.emitArg = function(a, b) {
    return this.p("a_" + a + "_" + b);
  };
  Emitter.prototype.emitVal = function(x) {
    if (typeof x === 'string') {
      return this.p(JSON.stringify(x));
    } else {
      return this.p('' + x);
    }
  };
  Emitter.prototype.tab = function() {
    var i, _results;
    i = 0;
    _results = [];
    while (i < this.indention) {
      this.p(" ");
      _results.push(i++);
    }
    return _results;
  };
  Emitter.prototype.cr = function() {
    this.p("\n");
    return this.tab();
  };
  Emitter.prototype.p = function() {
    var x, _i, _len;
    for (_i = 0, _len = arguments.length; _i < _len; _i++) {
      x = arguments[_i];
      this.buffer.push(x);
    }
    return this;
  };
  Emitter.prototype.commas = function(nodes) {
    var many, node, _i, _len, _results;
    many = false;
    _results = [];
    for (_i = 0, _len = nodes.length; _i < _len; _i++) {
      node = nodes[_i];
      if (many) {
        this.p(", ");
      } else {
        many = true;
      }
      _results.push(this.emit(node));
    }
    return _results;
  };
  Emitter.prototype.list = function(nodes) {
    this.p("(");
    this.commas(nodes);
    return this.p(")");
  };
  Emitter.prototype.brackets = function(nodes) {
    this.p("[");
    this.commas(nodes);
    return this.p("]");
  };
  Emitter.prototype.emitBlock = function(nodes) {
    var node, _i, _len;
    if (nodes.length === 0) {
      return this.p("{}");
    } else {
      this.p("{");
      this.indent();
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        node = nodes[_i];
        this.cr();
        this.emit(node);
        this.p(";");
      }
      this.unindent();
      this.cr();
      return this.p("}");
    }
  };
  Emitter.prototype.emitIf = function(a, b, c) {
    this.p("if (!(");
    this.emit(a);
    this.p(" == null || ");
    this.emit(a);
    this.p(" === false)) ");
    this.emitBlock(b);
    if (c && c.length !== 0) {
      this.p(" else ");
      if (c[0][0] === 'IF' && c.length === 1) {
        return this.emit(c[0]);
      } else {
        return this.emitBlock(c);
      }
    }
  };
  Emitter.prototype.emitControlStructure = function(prefix, sentinel, label, body) {
    if (sentinel) {
      this.p("try {");
      this.indent();
      this.cr();
    }
    this.emit(label);
    this.p(":");
    this.p(prefix);
    this.emitBlock(body);
    if (sentinel) {
      this.unindent();
      this.cr();
      this.p("} catch(e) {");
      this.indent();
      this.cr();
      this.p("if (");
      this.emit(sentinel);
      this.p(") ");
      this.p("throw e;");
      this.unindent();
      this.cr();
      this.p("} finally {");
      this.indent();
      this.cr();
      this.emit(sentinel);
      this.p(" = false;");
      this.unindent();
      this.cr();
      return this.p("}");
    }
  };
  Emitter.prototype.emit = function(node) {
    var a, b, c, d, tag;
    tag = node[0], a = node[1], b = node[2], c = node[3], d = node[4];
    switch (tag) {
      case 'VAL':
        this.emitVal(a);
        break;
      case 'ARG':
        this.emitArg(a, b);
        break;
      case 'LOCAL':
        this.emitLocal(a, b);
        break;
      case 'LABEL':
        this.emitLabel(a, b);
        break;
      case 'GLOBAL':
        this.emitGlobal(a, b);
        break;
      case 'IF':
        this.emitIf(a, b, c);
        break;
      case 'RAW':
        this.p(a);
        break;
      case 'BLOCK':
        this.emitControlStructure("", a, b, c);
        break;
      case 'LOOP':
        this.emitControlStructure("for(;;)", a, b, c);
        break;
      case 'FIELD':
        this.emit(a);
        this.p("[");
        this.emit(b);
        this.p("]");
        break;
      case 'SET!':
        this.emit(a);
        this.p(" = ");
        this.emit(b);
        break;
      case 'CALL':
        this.emit(a);
        this.list(b);
        break;
      case 'NEW':
        this.p("new ");
        this.emit(a);
        this.list(b);
        break;
      case 'RETURN':
        this.p("return ");
        this.emit(a);
        break;
      case 'BREAK':
        this.p("break ");
        this.emit(a);
        break;
      case 'DECLARE':
        this.p("var ");
        this.commas(a);
        break;
      case 'FUNCTION':
        this.p("function");
        this.list(a);
        this.p(" ");
        this.emitBlock(b);
        break;
      case 'ARRAY':
        this.brackets(a);
        break;
      case 'THROW':
        this.p("throw ");
        this.emit(a);
        break;
      default:
        throw Error("[BUG] invalid tag sent to emitter " + tag);
    }
    return this;
  };
  Emitter.emitToplevel = function(toplevel) {
    return new Emitter().emitBlock(toplevel).toString();
  };
  return Emitter;
})();