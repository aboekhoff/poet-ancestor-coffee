#!/usr/bin/env node

(function() {

var $COMPILER_MACROS, $OUT, $PACKAGE, $RUNTIME, List, Map, Method, RT, Set, Symbol, Tag, Var, apply, baseNS, baseSymbol, concat, cons, contains, first, foldl, forEach, fromArray, get, isEmpty, map, newline, partition, pr, print, println, prn, put, raise, represent, representArray, rest, size, toArray, toType, toTypeName, toUID, _cat;
RT = {};
baseNS = "gandalf";
baseSymbol = function(name) {
  return new Symbol(name, baseNS);
};
raise = function(msg) {
  throw Error(msg);
};
Var = (function() {
  function Var(name, init, ns) {
    var key;
    ns = ns || baseNS;
    key = ns + "#" + name;
    if (arguments.length === 2) {
      RT[key] = init;
    }
    return function() {
      if (arguments.length === 0) {
        return RT[key];
      } else {
        return RT[key] = arguments[0];
      }
    };
  }
  return Var;
})();
$RUNTIME = Var('*runtime*');
$OUT = Var('*out*');
$PACKAGE = Var('*package*');
$COMPILER_MACROS = Var('*compiler-macros*');
Symbol = (function() {
  function Symbol(name, ns, tags) {
    if (!(this instanceof Symbol)) {
      return new Symbol(name, ns, tags);
    } else {
      this.name = name;
      this.ns = ns || null;
      this.tags = tags || List.empty();
      return this;
    }
  }
  Symbol.prototype.toString = function() {
    if (this.ns) {
      return '##' + this.ns + '#' + this.name;
    } else {
      return this.name;
    }
  };
  Symbol.isQualified = function(sym) {
    return sym instanceof Symbol && sym.ns !== null;
  };
  Symbol.isTagged = function(sym) {
    return sym instanceof Symbol && sym.tags.size > 0;
  };
  Symbol.unqualify = function(sym) {
    return new Symbol(sym.name, null, null);
  };
  Symbol.untag = function(sym) {
    return new Symbol(sym.name, null, sym.tags.tail);
  };
  Symbol.reify = function(sym) {
    if (sym instanceof Symbol && Symbol.isTagged(sym)) {
      return new Symbol("#:" + toArray(sym.tags).join(":") + ":" + sym.name);
    } else {
      return sym;
    }
  };
  Symbol.swapTag = function(sym, tag) {
    if (!sym.ns && sym.tags.head === tag) {
      return new Symbol(sym.name, null, sym.tags.tail);
    } else {
      return new Symbol(sym.name, null, cons(tag, sym.tags));
    }
  };
  Symbol.removeTag = function(sym, tag) {
    if (!sym.ns && sym.tags.head === tag) {
      return new Symbol(sym.name, null, sym.tags.tail);
    } else {
      return sym;
    }
  };
  Symbol.ensureTag = function(sym, tag) {
    if (!sym.ns && sym.tags.head === tag) {
      return sym;
    } else {
      return new Symbol(sym.name, null, cons(tag, sym.tags));
    }
  };
  return Symbol;
})();
Tag = (function() {
  function Tag(data) {
    if (!(this instanceof Tag)) {
      return new Tag(data);
    } else {
      this.data = data;
      this.id = Tag.nextId++;
      this._uid = "<Tag: " + this.id + ">";
      return this;
    }
  }
  Tag.prototype.toString = function() {
    return this.id;
  };
  Tag.nextId = 1;
  return Tag;
})();
List = (function() {
  function List(head, tail, size) {
    if (!(this instanceof List)) {
      return new List(head, tail, size);
    } else {
      this.head = head;
      this.tail = tail;
      this.size = size;
      return this;
    }
  }
  List.empty = function() {
    return new List(null, null, 0);
  };
  List.create = function() {
    return List.fromArray(arguments);
  };
  List.fromArray = function(arr) {
    var i, j, ls;
    ls = new List(null, null, 0);
    i = arr.length;
    j = 1;
    while (i--) {
      ls = new List(arr[i], ls, j);
      j++;
    }
    return ls;
  };
  List.toArray = function(ls) {
    var arr, i, size;
    size = ls.size;
    arr = [];
    arr.size = size;
    i = 0;
    while (i < size) {
      arr[i++] = ls.head;
      ls = ls.tail;
    }
    return arr;
  };
  return List;
})();
Map = (function() {
  function Map(entries) {
    if (!(this instanceof Map)) {
      return new Map(entries);
    } else {
      this.entries = entries || [{}];
      return this;
    }
  }
  Map.create = function(kvs) {
    var i, key, map, val;
    map = new Map([{}]);
    i = 0;
    while (i < arguments.length) {
      key = arguments[i++];
      val = arguments[i++];
      Map.putEntry(map, toUID(key), [key, val]);
    }
    return map;
  };
  Map.extend = function(map) {
    var _entries;
    _entries = map.entries.slice();
    _entries.unshift({});
    return new Map(_entries);
  };
  Map.containsEntry = function(map, uid) {
    var entry, _i, _len, _ref;
    _ref = map.entries;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      entry = _ref[_i];
      if (uid in entry) {
        return true;
      }
    }
    return false;
  };
  Map.getEntry = function(map, uid, notFound) {
    var entry, _i, _len, _ref;
    _ref = map.entries;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      entry = _ref[_i];
      if (uid in entry) {
        return entry[uid];
      }
    }
    return notFound;
  };
  Map.putEntry = function(map, uid, entry) {
    return map.entries[0][uid] = entry;
  };
  Map.get = function(map, key, notFound) {
    var result;
    result = Map.getEntry(map, toUID(key), null);
    if (result) {
      return result[1];
    } else {
      return notFound;
    }
  };
  Map.contains = function(map, key) {
    return Map.containsEntry(map, toUID(key));
  };
  Map.put = function(map, key, val) {
    var i;
    Map.putEntry(map, toUID(key), [key, val]);
    i = 3;
    while (i < arguments.length) {
      key = arguments[i++];
      val = arguments[i++];
      Map.putEntry(map, toUID(key), [key, val]);
    }
    return map;
  };
  Map.keys = function(map) {
    var k, _, _i, _len, _ref, _ref2, _results;
    _ref = Map.toArray(map);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      _ref2 = _ref[_i], k = _ref2[0], _ = _ref2[1];
      _results.push(k);
    }
    return _results;
  };
  Map.vals = function(map) {
    var v, _, _i, _len, _ref, _ref2, _results;
    _ref = Map.toArray(map);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      _ref2 = _ref[_i], _ = _ref2[0], v = _ref2[1];
      _results.push(v);
    }
    return _results;
  };
  Map.toArray = function(map) {
    var array, e, k, seen, v, _i, _len, _ref;
    array = [];
    seen = {};
    _ref = map.entries;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      e = _ref[_i];
      for (k in e) {
        v = e[k];
        if (e.hasOwnProperty(k) && !seen[k]) {
          seen[k] = true;
          array.push(e[k]);
        }
      }
    }
    return array;
  };
  Map.fromArray = function(array) {
    var k, m, v, _i, _len, _ref;
    m = new Map([{}]);
    for (_i = 0, _len = array.length; _i < _len; _i++) {
      _ref = array[_i], k = _ref[0], v = _ref[1];
      Map.put(m, k, v);
    }
    return m;
  };
  return Map;
})();
Set = (function() {
  function Set(map) {
    if (!(this instanceof Set)) {
      new Set(map);
    } else {
      this.map = new Map([{}]);
    }
  }
  Set.put = function(set, key) {
    var i;
    Map.put(set.map, key, key);
    if (arguments.length > 2) {
      i = 2;
      while (i < arguments.length) {
        key = arguments[i];
        Map.put(set.map, key, key);
      }
    }
    return set;
  };
  Set.get = function(set, key, notFound) {
    return Map.get(set.map, key, notFound);
  };
  Set.contains = function(set, key) {
    return Map.contains(set, key);
  };
  Set.toArray = function(set) {
    return Map.keys(set.map);
  };
  Set.fromArray = function(array) {
    var key, set, _i, _len;
    set = new Set(new Map([{}]));
    for (_i = 0, _len = array.length; _i < _len; _i++) {
      key = array[_i];
      Set.put(set, key);
    }
    return set;
  };
  return Set;
})();
Method = (function() {
  function Method(options) {
    var handle, id, index, method, name;
    options || (options = {});
    index = options.index || 0;
    name = options.name || "anonymous";
    id = Method.NEXT_ID++;
    handle = Method.HANDLE + id + "__" + name;
    method = function() {
      var impl, vtable;
      vtable = arguments[index];
      if (vtable === null) {
        vtable = Method.NULL_VTABLE;
      } else if (vtable === void 0) {
        vtable = Method.VOID_VTABLE;
      }
      impl = vtable[handle] || method[Method.DEFAULT];
      return impl.apply(null, arguments);
    };
    method._name = name;
    method[Method.HANDLE] = handle;
    method[Method.DEFAULT] = function() {
      throw Error("no implementation or default for method " + name + " for type " + toTypeName(arguments[index]));
    };
    method.extend = function() {
      return Method.extend(method, arguments);
    };
    return method;
  }
  Method.NEXT_ID = 1;
  Method.NULL_VTABLE = {};
  Method.VOID_VTABLE = {};
  Method.HANDLE = "__METHOD_HANDLE__";
  Method.DEFAULT = "__DEFAULT_METHOD__";
  Method.extend1 = function(method, type, impl) {
    var vtable;
    if (type === Method.DEFAULT) {
      return method[Method.DEFAULT] = impl;
    } else {
      vtable = type;
      if (vtable === null) {
        vtable = Method.NULL_VTABLE;
      } else if (vtable === void 0) {
        vtable = Method.VOID_VTABLE;
      } else if (vtable instanceof Function) {
        vtable = vtable.prototype;
      }
      return vtable[method[Method.HANDLE]] = impl;
    }
  };
  Method.extend = function(method, extensions) {
    var impl, index, type, _results;
    index = 0;
    _results = [];
    while (index < extensions.length) {
      type = extensions[index++];
      impl = extensions[index++];
      _results.push(Method.extend1(method, type, impl));
    }
    return _results;
  };
  return Method;
})();
$RUNTIME = Var('*runtime*', RT);
$OUT = Var('*out*', (function(x) {
  return process.stdout.write(x);
}));
$PACKAGE = Var('*package*');
$COMPILER_MACROS = Var('*compiler-macros*', new Map());
represent = Method({
  name: 'represent'
});
represent.extend(null, function(_, p, _) {
  return p("#nil");
}, void 0, function(_, p, _) {
  return p("#void");
}, Boolean, function(x, p, _) {
  if (x) {
    return p("#t");
  } else {
    return p("#f");
  }
}, Number, function(x, p, _) {
  if (isNaN(x)) {
    return p("#nan");
  } else {
    return p('' + x);
  }
}, String, function(x, p, m) {
  if (m) {
    return p(JSON.stringify(x));
  } else {
    return p(x);
  }
}, Symbol, function(x, p, m) {
  if (x.ns) {
    p("##" + x.ns + "#");
  }
  if (!(isEmpty(x.tags))) {
    p("#:" + toArray(x.tags).join(":") + ":");
  }
  return p(x.name);
}, Array, function(xs, p, m) {
  p("[");
  representArray(xs, p, m);
  return p("]");
}, List, function(x, p, m) {
  p("(");
  representArray(List.toArray(x), p, m);
  return p(")");
}, Map, function(x, p, m) {
  var entries;
  p("#<Map:");
  entries = Map.toArray(x);
  if (entries.length > 0) {
    p(" ");
    representArray(Map.toArray(x), p, m);
  }
  return p(">");
}, Set, function(x, p, m) {
  var entries;
  p("#<Set:");
  entries = Set.toArray(x);
  if (entries.length > 0) {
    p(" ");
    representArray(Set.toArray(x), p, m);
  }
  return p(">");
}, Function, function(x, p, m) {
  var name;
  name = x._name || x.name;
  name = name ? ':' + name : '';
  return p("#<Function" + name + ">");
}, Method.DEFAULT, function(x, p, _) {
  var name, str;
  name = x.constructor.name || "Object";
  str = x.toString !== Object.prototype.toString ? ' ' + x : '';
  return p("#<" + name + str + ">");
});
representArray = function(xs, p, m) {
  var many, x, _i, _len, _results;
  many = false;
  _results = [];
  for (_i = 0, _len = xs.length; _i < _len; _i++) {
    x = xs[_i];
    if (many) {
      p(" ");
    } else {
      many = true;
    }
    _results.push(represent(x, p, m));
  }
  return _results;
};
newline = function() {
  return $OUT()("\n");
};
pr = function() {
  return representArray(arguments, $OUT(), true);
};
prn = function() {
  representArray(arguments, $OUT(), true);
  return newline();
};
print = function() {
  return representArray(arguments, $OUT(), false);
};
println = function() {
  representArray(arguments, $OUT(), false);
  return newline();
};
toUID = Method({
  name: 'to-uid'
});
toUID.extend(null, function(_) {
  return "null";
}, void 0, function(_) {
  return "undefined";
}, Boolean(function() {}), function(x) {
  return '<Boolean: ' + x + '>';
}, Number, function(x) {
  return '<Number: ' + x + '>';
}, String, function(x) {
  return '<String: ' + x + '>';
}, Array, function(x) {
  if (!x._uid) {
    x._uid = "<Array: " + map(toUID, x).join(" ") + ">";
  }
  return x._uid;
}, Tag, function(x) {
  return x._uid;
}, Symbol, function(x) {
  if (!x._uid) {
    x._uid = "<Symbol: " + (toUID(x.name)) + " " + (toUID(x.ns)) + " " + (toUID(x.tags)) + ">";
  }
  return x._uid;
}, List, function(x) {
  if (!x._uid) {
    x._uid = "<List: " + map(toUID, List.toArray(x)).join(" ") + ">";
  }
  return x._uid;
});
toType = Method({
  name: 'to-type'
});
toType.extend(null, function() {
  return null;
}, void 0, function() {
  return;
}, Method.DEFAULT, function(x) {
  return x.constructor;
});
toTypeName = function(x) {
  var type;
  type = toType(x);
  if (type === null) {
    return "#nil";
  } else if (type === void 0) {
    return "#void";
  } else {
    return type._name || type.name || "Object";
  }
};
toArray = Method({
  name: 'to-array'
});
toArray.extend(null, function() {
  return [];
}, String, function(s) {
  var c, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = s.length; _i < _len; _i++) {
    c = s[_i];
    _results.push(c);
  }
  return _results;
}, Array, function(x) {
  return x.slice();
}, List, List.toArray, Map, Map.toArray, Set, Set.toArray);
fromArray = function(type, array) {
  return type.fromArray(array);
};
isEmpty = Method({
  name: 'empty?'
});
isEmpty.extend(null, function() {
  return true;
}, String, function(s) {
  return s.length === 0;
}, Array, function(xs) {
  return xs.length === 0;
}, List, function(xs) {
  return xs.size === 0;
}, Method.DEFAULT, function(xs) {
  return toArray(xs).length === 0;
});
size = Method({
  name: 'size'
});
size.extend(null, function() {
  return 0;
}, String, function(s) {
  return s.length;
}, Array, function(xs) {
  return xs.length;
}, List, function(xs) {
  return xs.size;
}, Method.DEFAULT, function(xs) {
  return toArray(xs).length;
});
forEach = Method({
  name: 'for-each',
  index: 1
});
forEach.extend(null, function(_, _) {
  return null;
}, String, function(f, s) {
  var c, _i, _len;
  for (_i = 0, _len = s.length; _i < _len; _i++) {
    c = s[_i];
    f(c);
  }
  return null;
}, Array, function(f, xs) {
  var x, _i, _len;
  for (_i = 0, _len = xs.length; _i < _len; _i++) {
    x = xs[_i];
    f(x);
  }
  return null;
}, List, function(f, xs) {
  while (xs.size > 0) {
    f(xs.head);
    xs = xs.tail;
  }
  return null;
}, Method.DEFAULT, function(f, xs) {
  return forEach(f, toArray(xs));
});
map = Method({
  name: 'map',
  index: 1
});
map.extend(null, function(_, _) {
  return null;
}, String, function(f, s) {
  var buf, c, i, _len;
  buf = [];
  buf.length = s.length;
  for (i = 0, _len = s.length; i < _len; i++) {
    c = s[i];
    buf[i] = f(c);
  }
  return buf.join("");
}, Array, function(f, xs) {
  var i, x, ys, _len;
  ys = [];
  ys.length = xs.length;
  for (i = 0, _len = xs.length; i < _len; i++) {
    x = xs[i];
    ys[i] = f(x);
  }
  return ys;
}, List, function(f, xs) {
  var i, ys;
  ys = [];
  i = 0;
  while (xs.size > 0) {
    ys[i] = f(xs.head);
    xs = xs.tail;
    i++;
  }
  return List.fromArray(ys);
}, Method.DEFAULT, function(f, xs) {
  var type;
  type = toType(xs);
  return type.fromArray(map(f, toArray(xs)));
});
first = Method({
  name: 'first'
});
first.extend(null, function(_) {
  return null;
}, String, function(x) {
  if (x.length > 0) {
    return x[0];
  } else {
    return null;
  }
}, Array, function(x) {
  if (x.length > 0) {
    return x[0];
  } else {
    return null;
  }
}, List, function(x) {
  return x.head;
}, Method.DEFAULT, function(x) {
  return first(toArray(x));
});
rest = Method({
  name: 'rest'
});
rest.extend(null, function(_) {
  return null;
}, String, function(x) {
  return List.fromArray(x).tail;
}, Array, function(x) {
  return List.fromArray(x).tail;
}, List, function(x) {
  return x.tail;
}, Method.DEFAULT, function(x) {
  return List.fromArray(toArray(x)).tail;
});
get = Method({
  name: 'get'
});
get.extend(Map, Map.get, Set, Set.get);
put = Method({
  name: 'put'
});
put.extend(Map, Map.put, Set, Set.put);
contains = Method({
  name: 'contains'
});
contains.extend(Map, Map.contains, Set, Set.contains);
cons = Method({
  name: 'cons',
  index: 1
});
cons.extend(String, function(x, xs) {
  xs = List.fromArray(xs);
  return new List(x, xs, xs.size + 1);
}, Array, function(x, xs) {
  xs = List.fromArray(xs);
  return new List(x, xs, xs.size + 1);
}, List, function(x, xs) {
  return new List(x, xs, xs.size + 1);
}, Method.DEFAULT, function(x, xs) {
  xs = List.fromArray(toArray(xs));
  return new List(x, xs, xs.size + 1);
});
foldl = function(f, x, xs) {
  var i, n, y, _i, _len;
  n = arguments.length;
  switch (n) {
    case 2:
      xs = x instanceof Array ? x : toArray(x);
      x = xs[0];
      i = 1;
      while (i < xs.length) {
        x = f(x, xs[i]);
        i++;
      }
      return x;
    case 3:
      xs = xs instanceof Array ? xs : toArray(xs);
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        y = xs[_i];
        x = f(x, y);
      }
      return x;
    default:
      return raise("foldl takes two or three args, got " + n);
  }
};
partition = function(n, xs) {
  var end, i, j, m, ys, zs;
  xs = xs instanceof Array ? xs : toArray(xs);
  ys = [];
  end = xs.length;
  i = 0;
  m = 0;
  while (i < end) {
    j = 0;
    zs = [];
    zs.length = n;
    while (j < n) {
      zs[j] = xs[i];
      j++;
      i++;
    }
    ys[m] = zs;
    m++;
  }
  return ys;
};
_cat = function(x, y) {
  var i, _results;
  x = toArray(x);
  i = x.length;
  _results = [];
  while (i--) {
    _results.push(y.unshift(x[i]));
  }
  return _results;
};
concat = function() {
  var i, j, tail, x;
  switch (arguments.length) {
    case 0:
      return [];
    case 1:
      return toArray(arguments[0]);
    default:
      i = arguments.length - 1;
      tail = toArray(arguments[i]);
      while (i--) {
        x = toArray(arguments[i]);
        j = x.length;
        while (j--) {
          tail.unshift(x[j]);
        }
      }
      return tail;
  }
};
apply = function(f) {
  var arglist, i;
  switch (arguments.length) {
    case 1:
      return f();
    case 2:
      return f.apply(null, toArray(arguments[1]));
    default:
      i = arguments.length - 1;
      arglist = toArray(arguments[i]);
      while (i > 1) {
        i--;
        arglist.unshift(arguments[i]);
      }
      return f.apply(null, arglist);
  }
};

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
  Reader.parseAtom = function(s) {
    if (s[0] === ':') {
      return Keyword.create(s.substring(1));
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

var Env, Macro, Package, SpecialForm, collectDefines, expand, expandArray, expandBody, expandCall, expandLetRec, expandList, expandMap, expandQuasiquote, expandSymbol, flattenBody, isSpecialFormCall, macroexpand, macroexpand1;
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
    console.log(transformer.toString());
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
expandCall = function(e, ls) {
  var ex;
  ex = function(x) {
    return expand(e, x);
  };
  return map(ex, ls);
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
  var x, ys, _i, _len;
  xs = toArray(xs);
  ys = [];
  for (_i = 0, _len = xs.length; _i < _len; _i++) {
    x = xs[_i];
    x = toArray(x);
    ys.push([normalize(x[0]), normalize(x[1])]);
  }
  return ys;
};
normalizeList = function(x) {
  var args, callee, node, _, _ref;
  if (isSpecialFormSymbol(x[0])) {
    switch (x[0].name) {
      case 'do':
        return ['DO', _normalize(x.slice(1))];
      case 'if':
        return ['IF', normalize(x[1]), normalize(x[2]), normalize(x[3])];
      case 'let':
        return ['LET', normalizeBindings(x[1]), normalize(x[2])];
      case 'letrec':
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
    var v, x, _compiler, _i, _j, _len, _len2, _pairs, _ref, _ref2, _v;
    _compiler = this.extendEnv();
    _pairs = [];
    for (_i = 0, _len = pairs.length; _i < _len; _i++) {
      _ref = pairs[_i], v = _ref[0], x = _ref[1];
      _v = _compiler.bindLocal(v);
      _pairs.push([_v, x]);
    }
    for (_j = 0, _len2 = _pairs.length; _j < _len2; _j++) {
      _ref2 = _pairs[_j], _v = _ref2[0], x = _ref2[1];
      this.compile(x, Compiler.tracerFor(_v));
    }
    return _compiler.compile(body, tracer);
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

var bootstrap;
var __indexOf = Array.prototype.indexOf || function(item) {
  for (var i = 0, l = this.length; i < l; i++) {
    if (this[i] === item) return i;
  }
  return -1;
};
$RUNTIME(RT);
$PACKAGE(Package.get(baseNS));
$COMPILER_MACROS(new Map());
$OUT(typeof process !== 'undefined' ? function(x) {
  return process.stdout.write(x);
} : typeof console !== 'undefined' ? function(x) {
  return console.log(x);
} : function(x) {
  return false;
});
bootstrap = function(packageName, object) {
  var k, pkg, v, _results;
  pkg = Package.get(packageName);
  _results = [];
  for (k in object) {
    v = object[k];
    _results.push(object.hasOwnProperty(k) ? (RT[packageName + "#" + k] = v, Package.intern(pkg, new Symbol(k))) : void 0);
  }
  return _results;
};
bootstrap(baseNS, {
  "+": function(x, y) {
    var i, r;
    switch (arguments.length) {
      case 0:
        return 0;
      case 1:
        return x;
      case 2:
        return x + y;
      default:
        r = x + y;
        i = 2;
        while (i < arguments.length) {
          r = r + arguments[i++];
        }
        return r;
    }
  },
  "*": function(x, y) {
    var i, r;
    switch (arguments.length) {
      case 0:
        return 1;
      case 1:
        return x;
      case 2:
        return x * y;
      default:
        r = x * y;
        i = 2;
        while (i < arguments.length) {
          r = r * arguments[i++];
        }
        return r;
    }
  },
  "-": function(x, y) {
    var i, r;
    switch (arguments.length) {
      case 0:
        return raise("- requires at least one argument");
      case 1:
        return -x;
      case 2:
        return x - y;
      default:
        r = x - y;
        i = 2;
        while (i < arguments.length) {
          r = r - arguments[i++];
        }
        return r;
    }
  },
  "/": function(x, y) {
    var i, r;
    switch (arguments.length) {
      case 0:
        return raise("/ requires at least one argument");
      case 1:
        return 1 / x;
      case 2:
        return x / y;
      default:
        r = x / y;
        i = 2;
        while (i < arguments.length) {
          r = r * arguments[i++];
        }
        return r;
    }
  },
  "<": function(x, y) {
    return x < y;
  },
  ">": function(x, y) {
    return x > y;
  },
  "<=": function(x, y) {
    return x <= y;
  },
  ">=": function(x, y) {
    return x >= y;
  },
  "eq?": function(x, y) {
    return x === y;
  },
  "div": function(x, y) {
    return ~~(x / y);
  },
  "mod": function(x, y) {
    return x % y;
  },
  "bit-or": function(x, y) {
    return x | y;
  },
  "bit-and": function(x, y) {
    return x & y;
  },
  "bit-xor": function(x, y) {
    return x ^ y;
  },
  "bit-not": function(x) {
    return ~x;
  },
  "bit-shift-left": function(x, y) {
    return x << y;
  },
  "bit-shift-right": function(x, y) {
    return x >> y;
  },
  "bit-shift-right*": function(x, y) {
    return x >>> y;
  },
  "typeof": function(x) {
    return typeof x;
  },
  "instance?": function(x, y) {
    return x instanceof y;
  },
  "has-property?": function(x, y) {
    return __indexOf.call(x, y) >= 0;
  },
  "Boolean": Boolean,
  "String": String,
  "Number": Number,
  "Array": Array,
  "Date": Date,
  "Object": Object,
  "RegExp": RegExp,
  "nil?": function(x) {
    return x === null;
  },
  "void?": function(x) {
    return x === void 0;
  },
  "boolean?": function(x) {
    return typeof x === 'boolean';
  },
  "number?": function(x) {
    return typeof x === 'number';
  },
  "string?": function(x) {
    return typeof x === 'string';
  },
  "array?": function(x) {
    return x instanceof Array;
  },
  "symbol?": function(x) {
    return x instanceof Symbol;
  },
  "list?": function(x) {
    return x instanceof List;
  },
  "set?": function(x) {
    return x instanceof Set;
  },
  "map?": function(x) {
    return x instanceof Map;
  },
  "regex?": function(x) {
    return x instanceof RegExp;
  },
  "fn?": function(x) {
    return typeof x === 'function';
  },
  "true?": function(x) {
    return x === true;
  },
  "false?": function(x) {
    return x === false;
  },
  "zero?": function(x) {
    return x === 0;
  },
  "even?": function(x) {
    return x % 2 === 0;
  },
  "odd?": function(x) {
    return x % 2 !== 0;
  },
  "positive?": function(x) {
    return x > 0;
  },
  "negative?": function(x) {
    return x < 0;
  },
  "Symbol": Symbol,
  "List": List,
  "Map": Map,
  "Set": Set,
  "list": List.create,
  "array": function() {
    var x, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = arguments.length; _i < _len; _i++) {
      x = arguments[_i];
      _results.push(x);
    }
    return _results;
  },
  "to-uid": toUID,
  "to-type": toType,
  "to-typename": toTypeName,
  "to-array": toArray,
  "from-array": fromArray,
  "empty?": isEmpty,
  "cons": cons,
  "first": first,
  "rest": rest,
  "for-each": forEach,
  "map": map,
  "size": size,
  "concat": concat,
  "partition": partition,
  "foldl": foldl,
  "represent": represent,
  "pr": pr,
  "prn": prn,
  "print": print,
  "println": println,
  "Package": Package,
  "Env": Env,
  "Compiler": Compiler,
  "Emitter": Emitter,
  "require": typeof require !== 'undefined' ? require : void 0,
  "process": typeof process !== 'undefined' ? process : void 0,
  "js": typeof global !== 'undefined' ? global : window,
  "macroexpand": function(x) {
    return expand($PACKAGE().env, x);
  },
  "*echo*": false,
  "*echo:expand*": false,
  "*echo:normalize*": false,
  "*echo:compile*": false,
  "*echo:emit*": false,
  "*echo:eval*": false
});
(function() {
  var k, p, v, _ref, _results;
  p = Package.get(baseNS);
  _ref = SpecialForm.cache;
  _results = [];
  for (k in _ref) {
    v = _ref[k];
    _results.push(SpecialForm.cache.hasOwnProperty(k) ? Package.intern(p, new Symbol(k), v) : void 0);
  }
  return _results;
})();

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

var f, fs, main, p, path, t, util;
fs = require('fs');
path = require('path');
util = require('util');
p = function(x) {
  return console.log(util.inspect(x, false, null));
};
t = true;
f = false;
main = function() {
  var file, i, rdr, src, _results;
  $PACKAGE(Package.createStandardPackage("user"));
  i = 2;
  _results = [];
  while (i < process.argv.length) {
    file = process.argv[i];
    console.log('loading ' + file);
    src = fs.readFileSync(process.argv[i], 'utf8');
    rdr = Reader.create(src, file);
    loadToplevel(rdr);
    _results.push(i++);
  }
  return _results;
};
main();

})();