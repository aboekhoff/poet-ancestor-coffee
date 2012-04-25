var Env, Macro, Package, SpecialForm, collectDefines, expand, expandArray, expandBody, expandCall, expandLetRec, expandList, expandMap, expandQuasiquote, expandSymbol, flattenBody, isFrontDotted, isSpecialFormCall, macroexpand, macroexpand1;
Env = (function() {
  function Env(vars, labels) {
    this.vars = vars;
    this.labels = labels;
    this.vars || (this.vars = new Map());
    this.labels || (this.labels = new Map());
  }
  Env.prototype.extend = function() {
    return new Env(Map.extend(this.vars), Map.extend(this.labels));
  };
  Env.prototype.get = function(which, key) {
    var dict, env, val, _env, _key, _results;
    if (Symbol.isQualified(key)) {
      _env = Package.get(key.ns).env;
      _key = Symbol.unqualify(key);
      return _env.get(which, _key);
    }
    _results = [];
    while (true) {
      dict = this[which];
      val = get(dict, key, null);
      if (val) {
        return val;
      } else if (Symbol.isTagged(key)) {
        env = key.tags.head.env;
        key = Symbol.untag(key);
      } else {
        return null;
      }
    }
    return _results;
  };
  Env.prototype.getVar = function(x) {
    return this.get('vars', x);
  };
  Env.prototype.getLabel = function(x) {
    return this.get('labels', x);
  };
  Env.prototype.putVar = function(x, y) {
    return put(this.vars, x, y);
  };
  Env.prototype.putLabel = function(x, y) {
    return put(this.labels, x, y);
  };
  Env.prototype.bindGlobal = function(x) {
    var _x;
    _x = Package.intern($PACKAGE(), x);
    this.putVar(x, _x);
    return _x;
  };
  Env.prototype.bindLocal = function(x) {
    var _x;
    _x = x instanceof Symbol ? Symbol.reify(x) : x;
    this.putVar(x, _x);
    return _x;
  };
  Env.prototype.bindLabel = function(x) {
    var _x;
    _x = x instanceof Symbol ? Symbol.reify(x) : x;
    this.putLabel(x, _x);
    return _x;
  };
  Env.prototype.makeTag = function() {
    return new Tag(this);
  };
  return Env;
})();
Package = (function() {
  function Package(name) {
    this.name = name;
    this.env = new Env();
    this.imports = new Set();
    this.exports = new Set();
    this.reexports = new Set();
  }
  Package.prototype.toString = function() {
    return this.name;
  };
  Package.intern = function(pkg, sym, val) {
    var qsym, rsym;
    rsym = Symbol.reify(sym);
    qsym = val || new Symbol(rsym.name, pkg.name);
    pkg.env.putVar(rsym, qsym);
    Set.put(pkg.exports, rsym);
    return qsym;
  };
  Package["import"] = function(importer, importee) {
    var exp, exports, pkgName, val, _i, _j, _len, _len2, _ref, _ref2, _results;
    exports = toArray(importee.exports);
    if (exports.length > 0) {
      put(importer.imports, importee.name);
      _ref = toArray(importee.exports);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        exp = _ref[_i];
        val = importee.env.getVar(exp);
        Package.intern(importer, exp, val);
      }
    }
    _ref2 = toArray(importee.reexports);
    _results = [];
    for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
      pkgName = _ref2[_j];
      _results.push(Package["import"](importer, Package.get(pkgName)));
    }
    return _results;
  };
  Package.cache = {};
  Package.exists = function(name) {
    return Package.cache.hasOwnProperty(name);
  };
  Package.get = function(name) {
    var _base;
    return (_base = Package.cache)[name] || (_base[name] = new Package(name));
  };
  Package.createStandardPackage = function(name) {
    if (!Package.exists(name)) {
      Package["import"](Package.get(name), Package.get(baseNS));
    }
    return Package.get(name);
  };
  Package.load = function(name) {
    if (!Package.exists(name)) {
      raise('Package.load not configured');
    }
    return Package.get(name);
  };
  return Package;
})();
Macro = (function() {
  function Macro(transformer) {
    this.transformer = transformer;
  }
  Macro.create = function(definingEnv, transformer) {
    var _transformer;
    _transformer = function(callingEnv, input) {
      var capture, compare, output, sanitize, tag;
      tag = new Tag(definingEnv);
      sanitize = Macro.createSanitizer(tag);
      capture = Macro.createCapturer(tag);
      compare = Macro.createComparator(tag);
      input = sanitize(input);
      output = sanitize(transformer(input, capture, compare));
      return output;
    };
    return new Macro(_transformer);
  };
  Macro.makeWalker = function(f) {
    var walk;
    return walk = function(x) {
      var g;
      if (x instanceof Symbol) {
        return f(x);
      } else if (x instanceof Array) {
        return map(walk, x);
      } else if (x instanceof List) {
        return map(walk, x);
      } else if (x instanceof Set) {
        return map(walk, x);
      } else if (x instanceof Map) {
        g = function(y) {
          return map(walk, y);
        };
        return map(g, x);
      } else {
        return x;
      }
    };
  };
  Macro.createSanitizer = function(t) {
    return Macro.makeWalker(function(x) {
      return Symbol.swapTag(x, t);
    });
  };
  Macro.createCapturer = function(t) {
    return Macro.makeWalker(function(x) {
      return Symbol.ensureTag(x, t);
    });
  };
  Macro.createComparator = function(t) {
    return function(x, y) {
      var _x, _y;
      if (x instanceof Symbol && y instanceof Symbol) {
        _x = x.swapTag(t);
        _y = y.swapTag(t);
        return callingEnv.getVar(_x) === callingEnv.getVar(_y);
      }
    };
  };
  return Macro;
})();
SpecialForm = (function() {
  function SpecialForm(name, transformer) {
    this.name = name;
    this.transformer = transformer;
  }
  SpecialForm.prototype.toSymbol = function() {
    return baseSymbol(this.name);
  };
  SpecialForm.define = function(object) {
    var name, transformer;
    for (name in object) {
      transformer = object[name];
      SpecialForm.cache[name] = new SpecialForm(name, transformer);
    }
    return null;
  };
  SpecialForm.cache = {};
  SpecialForm.get = function(name) {
    return this.cache[name];
  };
  return SpecialForm;
})();
SpecialForm.define({
  "include": function(e, x) {
    return raise("include outside of toplevel");
  },
  "import": function(e, x) {
    return raise("import outside of toplevel");
  },
  "define*": function(e, x) {
    return raise("define* outside of toplevel");
  },
  "define-macro*": function(e, x) {
    return raise("define-macro* outside of toplevel");
  },
  "do": function(e, x) {
    return expandBody(e, x);
  },
  "if": function(e, x) {
    return List.create(baseSymbol("if"), expand(e, x.head), expand(e, x.tail.head), expand(e, x.tail.tail.head));
  },
  "set!": function(e, x) {
    return List.create(baseSymbol("set!"), expand(e, x.head), expand(e, x.tail.head));
  },
  "throw!": function(e, x) {
    return List.create(baseSymbol("throw!"), expand(e, x.head));
  },
  ".": function(e, x) {
    return List.create(baseSymbol("."), expand(e, x.head), expand(e, x.tail.head));
  },
  "block": function(e, x) {
    e = e.extend();
    return List.create(baseSymbol("block"), e.bindLabel(x.head), expandBody(e, x.tail));
  },
  "loop": function(e, x) {
    e = e.extend();
    e.bindLabel(null);
    return List.create(baseSymbol("loop"), expandBody(e, x));
  },
  "return-from": function(e, x) {
    return List.create(baseSymbol("return-from"), e.getLabel(x.head), expand(e, x.tail.head));
  },
  "unwind-protect": function(e, x) {
    return List.create(baseSymbol("unwind-protect"), expand(e, x.head), expand(e, x.tail.head));
  },
  "let": function(e, x) {
    var bindings, expr, i, name, pair, pairs, v, vals, vars, _, _i, _j, _len, _len2, _len3, _ref, _ref2;
    vals = [];
    vars = [];
    pairs = toArray(x.head);
    for (_i = 0, _len = pairs.length; _i < _len; _i++) {
      pair = pairs[_i];
      _ref = toArray(pair), _ = _ref[0], expr = _ref[1];
      vals.push(expand(e, expr));
    }
    e = e.extend();
    for (_j = 0, _len2 = pairs.length; _j < _len2; _j++) {
      pair = pairs[_j];
      _ref2 = toArray(pair), name = _ref2[0], _ = _ref2[1];
      vars.push(e.bindLocal(name));
    }
    bindings = [];
    for (i = 0, _len3 = vars.length; i < _len3; i++) {
      v = vars[i];
      bindings.push(List.fromArray([v, vals[i]]));
    }
    return List.create(baseSymbol("let"), List.fromArray(bindings), expandBody(e, x.tail));
  },
  "letrec": function(e, x) {
    var body, defs, i, _len;
    defs = toArray(x.head);
    for (i = 0, _len = defs.length; i < _len; i++) {
      x = defs[i];
      defs[i] = toArray(x);
    }
    body = toArray(x.tail);
    return expandLetRec(e, defs, body);
  },
  "js*": function(e, x) {
    return List.create(baseSymbol("js*"), x.head);
  },
  "quote": function(e, x) {
    return List.create(baseSymbol("quote"), x.head);
  },
  "fn*": function(e, x) {
    var $args, arg, args, body, form, _i, _len, _ref;
    e = e.extend();
    args = [];
    _ref = toArray(x.head);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      arg = _ref[_i];
      args.push(e.bindLocal(arg));
    }
    $args = List.fromArray(args);
    body = expandBody(e, x.tail);
    form = List.create(baseSymbol("fn*"), List.fromArray(args), body);
    return form;
  },
  "quasiquote": function(e, x) {
    return expand(e, expandQuasiquote(e, x.head));
  },
  "unquote": function(e, x) {
    return raise("unquote outside of quasiquote");
  },
  "unquote-splicing": function(e, x) {
    return raise("unquote splicing outside of quasiquote");
  },
  "new": function(e, x) {
    var ex;
    ex = function(x) {
      return expand(e, x);
    };
    return cons(baseSymbol("new"), map(ex, x));
  }
});
isSpecialFormCall = function(e, x, name) {
  return x instanceof List && e.getVar(x.head) === SpecialForm.get(name);
};
macroexpand1 = function(e, x) {
  var val;
  if (x instanceof List) {
    val = e.getVar(x.head);
    if (val instanceof Macro) {
      return val.transformer(e, x);
    }
  }
  return x;
};
macroexpand = function(e, x) {
  var y;
  y = macroexpand1(e, x);
  if (x === y) {
    return y;
  } else {
    return macroexpand(e, y);
  }
};
expand = function(e, x) {
  x = macroexpand(e, x);
  switch (true) {
    case x instanceof Symbol:
      return expandSymbol(e, x);
    case x instanceof List:
      return expandList(e, x);
    case x instanceof Array:
      return expandArray(e, x);
    case x instanceof Map:
      return expandMap(e, x);
    case x instanceof Set:
      return expandSet(e, x);
    default:
      return x;
  }
};
expandSymbol = function(e, x) {
  var val;
  val = e.getVar(x);
  if (!val) {
    return e.bindGlobal(x);
  } else if (val instanceof Macro) {
    return raise("can't take value of macro", x);
  } else if (val instanceof SpecialForm) {
    return raise("can't take value of special form", x);
  } else {
    return val;
  }
};
expandArray = function(e, xs) {
  var x, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = xs.length; _i < _len; _i++) {
    x = xs[_i];
    _results.push(expand(e, x));
  }
  return _results;
};
expandMap = function(e, d) {
  var k, v, _d, _i, _len, _ref, _ref2;
  _d = new Map();
  _ref = toArray(d);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    _ref2 = _ref[_i], k = _ref2[0], v = _ref2[1];
    put(_d, expand(e, k), expand(e, v));
  }
  return _d;
};
expandList = function(e, x) {
  var val;
  val = e.getVar(x.head);
  if (val instanceof SpecialForm) {
    return val.transformer(e, x.tail, x);
  } else {
    return expandCall(e, x);
  }
};
expandQuasiquote = function(e, x) {
  var q, qq, _q;
  q = function(x) {
    if (isSpecialFormCall(e, x, "unquote")) {
      return x.tail.head;
    } else if (isSpecialFormCall(e, x, "quasiquote")) {
      return List.create(baseSymbol("quote"), x);
    } else if (x instanceof Array) {
      return qq(x);
    } else if (x instanceof List) {
      return List.create(baseSymbol('from-array'), baseSymbol('List'), qq(x));
    } else if (x instanceof Map) {
      return List.create(baseSymbol('from-array'), baseSymbol('Map'), qq(x));
    } else if (x instanceof Set) {
      return List.create(baseSymbol('array->set'), baseSymbol('Set'), qq(x));
    } else if (x instanceof Symbol) {
      return List.create(baseSymbol('quote'), x);
    } else {
      return x;
    }
  };
  _q = function(x) {
    if (isSpecialFormCall(e, x, "unquote-splicing")) {
      return x.tail.head;
    } else {
      return [q(x)];
    }
  };
  qq = function(x) {
    return cons(baseSymbol('concat'), map(_q, x));
  };
  return q(x);
};
isFrontDotted = function(x) {
  return x instanceof Symbol && /^\.[^\.]+$/.test(x.name);
};
expandCall = function(e, ls) {
  var ex, head, method, _ls;
  head = first(ls);
  if (isFrontDotted(head)) {
    method = head.name.substring(1);
    _ls = List.create(baseSymbol("."), ls.tail.head, method);
    _ls = cons(_ls, ls.tail.tail);
    prn(_ls);
    return expand(e, _ls);
  } else {
    ex = function(x) {
      return expand(e, x);
    };
    return map(ex, ls);
  }
};
flattenBody = function(e, xs) {
  var result, x, _results;
  result = [];
  _results = [];
  while (true) {
    if (xs.length === 0) {
      return result;
    } else {
      x = macroexpand(e, xs.shift());
      if (isSpecialFormCall(e, x, "do")) {
        xs = concat(x.tail, xs);
      } else {
        result.push(x);
      }
    }
  }
  return _results;
};
collectDefines = function(e, xs) {
  var defs, rem, x;
  rem = xs.slice();
  defs = [];
  while (rem.length) {
    x = rem.shift();
    if (isSpecialFormCall(e, x, "define*")) {
      defs.push([x.tail.head, x.tail.tail.head]);
    } else {
      rem.unshift(x);
      break;
    }
  }
  return [defs, rem];
};
expandBody = function(e, xs) {
  var defs, i, rem, x, _len, _ref;
  xs = toArray(xs);
  xs = flattenBody(e, xs);
  _ref = collectDefines(e, xs), defs = _ref[0], rem = _ref[1];
  if (defs.length > 0) {
    return expandLetRec(e, defs, rem);
  } else {
    for (i = 0, _len = rem.length; i < _len; i++) {
      x = rem[i];
      rem[i] = expand(e, x);
    }
    switch (rem.length) {
      case 0:
        return null;
      case 1:
        return rem[0];
      default:
        return cons(baseSymbol("do"), List.fromArray(rem));
    }
  }
};
expandLetRec = function(e, defs, body) {
  var bindings, expr, exprs, i, name, names, res, x, _, _i, _j, _len, _len2, _len3, _ref, _ref2;
  e = e.extend();
  names = [];
  exprs = [];
  bindings = [];
  for (_i = 0, _len = defs.length; _i < _len; _i++) {
    _ref = defs[_i], name = _ref[0], _ = _ref[1];
    names.push(e.bindLocal(name));
  }
  for (_j = 0, _len2 = defs.length; _j < _len2; _j++) {
    _ref2 = defs[_j], _ = _ref2[0], expr = _ref2[1];
    exprs.push(expand(e, expr));
  }
  for (i = 0, _len3 = names.length; i < _len3; i++) {
    x = names[i];
    bindings.push(List.create(x, exprs[i]));
  }
  res = List.create(baseSymbol("letrec"), List.fromArray(bindings), expandBody(e, body));
  return res;
};