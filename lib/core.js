var $COMPILER_MACROS, $OUT, $PACKAGE, $RUNTIME, List, Map, Method, RT, Set, Symbol, Tag, Var, apply, baseNS, baseSymbol, concat, cons, contains, drop, dropWhile, first, foldl, forEach, fromArray, get, isEmpty, map, newline, partition, pr, print, println, prn, put, raise, represent, representArray, rest, size, take, takeWhile, toArray, toType, toTypeName, toUID, _cat;
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
  var constructor, name, str;
  constructor = x.constructor;
  if (constructor) {
    name = constructor.name;
  }
  name = name ? name : "Object";
  str = x.toString && x.toString !== Object.prototype.toString ? ' ' + x : '';
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
isEmpty.extend(void 0, function() {
  return true;
}, null, function() {
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
take = Method({
  name: 'take',
  index: 1
});
take.extend(null, function(_) {
  return null;
}, String, function(n, s) {
  return s.substring(0, n);
}, Array, function(n, xs) {
  return x.slice(0, n);
}, List, function(n, xs) {
  return List.fromArray(List.toArray(xs).slice(0, n));
});
drop = Method({
  name: 'drop',
  index: 1
});
drop.extend(null, function(_) {
  return null;
}, String, function(n, s) {
  return s.substring(n);
}, Array, function(n, xs) {
  return x.slice(n);
}, List, function(n, xs) {
  return List.fromArray(List.toArray(xs).slice(n));
});
takeWhile = Method({
  name: 'take-while',
  index: 1
});
takeWhile.extend(Method.DEFAULT, function(pred, xs) {
  var res, x, _i, _len, _ref;
  res = [];
  _ref = toArray(xs);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    x = _ref[_i];
    if (pred(x)) {
      res.push(x);
    } else {
      break;
    }
  }
  return res;
});
dropWhile = Method({
  name: 'drop-while',
  index: 1
});
dropWhile.extend(Method.DEFAULT, function(pred, xs) {
  var i, x, _len;
  xs = toArray(xs);
  for (i = 0, _len = xs.length; i < _len; i++) {
    x = xs[i];
    if (pred(x)) {
      null;
    } else {
      return xs.slice(i);
    }
  }
  return [];
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