# this should get moved to main or init or whatever, not here
# need to add special forms

$RUNTIME(RT)
$PACKAGE(Package.get(baseNS))
$COMPILER_MACROS(new Map())

$OUT(
  if typeof process != 'undefined'
    (x) -> process.stdout.write(x)
  else if typeof console != 'undefined'
    (x) -> console.log(x)
  else
    (x) -> false
)

bootstrap = (packageName, object) ->
  pkg = Package.get(packageName)

  for k, v of object
    if object.hasOwnProperty(k)
      RT[packageName + "#" + k] = v
      Package.intern(pkg, new Symbol(k))

# bootstrap builtins

bootstrap(baseNS, {
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
    "Date"        : Date
    "Object"      : Object
    "RegExp"      : RegExp

    "nil?"        : (x) -> x == null
    "void?"       : (x) -> x == undefined
    "boolean?"    : (x) -> typeof x == 'boolean'
    "number?"     : (x) -> typeof x == 'number'
    "string?"     : (x) -> typeof x == 'string'
    "array?"      : (x) -> x instanceof Array
    "symbol?"     : (x) -> x instanceof Symbol
    "list?"       : (x) -> x instanceof List
    "set?"        : (x) -> x instanceof Set
    "map?"        : (x) -> x instanceof Map
    "regex?"      : (x) -> x instanceof RegExp
    "fn?"         : (x) -> typeof x == 'function'

    "true?"       : (x) -> x == true
    "false?"      : (x) -> x == false
    "zero?"       : (x) -> x == 0
    "even?"       : (x) -> x%2 == 0
    "odd?"        : (x) -> x%2 != 0
    "positive?"   : (x) -> x > 0
    "negative?"   : (x) -> x < 0

    "Symbol"      : Symbol
    "List"        : List
    "Map"         : Map
    "Set"         : Set
    "list"        : List.create
    "array"       : () -> for x in arguments then x

    "to-uid"      : toUID
    "to-type"     : toType
    "to-typename" : toTypeName
    "to-array"    : toArray
    "from-array"  : fromArray

    "empty?"      : isEmpty
    "cons"        : cons
    "first"       : first
    "rest"        : rest
    "for-each"    : forEach
    "map"         : map
    "size"        : size
    "concat"      : concat
    "partition"   : partition
    "foldl"       : foldl
    "take"        : take
    "drop"        : drop
    "take-while"  : takeWhile
    "drop-while"  : dropWhile
    "apply"       : apply

    "represent"   : represent
    "pr"          : pr
    "prn"         : prn
    "print"       : print
    "println"     : println

    "Package"     : Package
    "Env"         : Env
    "Compiler"    : Compiler
    "Emitter"     : Emitter

    "require"     : if typeof require != 'undefined' then require else undefined
    "process"     : if typeof process != 'undefined' then process else undefined
    "js"          : if typeof global  != 'undefined' then global else window

    "macroexpand" : (x) -> macroexpand($PACKAGE().env, x)
    "expand"      : (x) -> expand($PACKAGE().env, x)
    "eval"        : () ->
    "load"        : () ->

    "*echo*"           : false
    "*echo:expand*"    : false
    "*echo:normalize*" : false
    "*echo:compile*"   : false
    "*echo:emit*"      : false
    "*echo:eval*"      : false

})

# bootstrap special forms

do () ->
  p = Package.get(baseNS)

  for k, v of SpecialForm.cache
    if SpecialForm.cache.hasOwnProperty(k)
      Package.intern(p, new Symbol(k), v)
