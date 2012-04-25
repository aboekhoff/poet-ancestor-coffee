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