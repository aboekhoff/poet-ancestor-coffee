RT = {}
baseNS     = "gandalf"
baseSymbol = (name) -> new Symbol(name, baseNS)
raise      = (msg)  -> throw Error(msg)

class Var
  constructor: (name, init, ns) ->
    ns  = ns || baseNS
    key = ns + "#" + name
    if arguments.length == 2 then RT[key] = init
    return () ->
      if arguments.length == 0
        return RT[key]
      else
        return RT[key] = arguments[0]

$RUNTIME         = Var('*runtime*')
$OUT             = Var('*out*')
$PACKAGE         = Var('*package*')
$COMPILER_MACROS = Var('*compiler-macros*')

class Symbol
  constructor: (name, ns, tags) ->
    if !(this instanceof Symbol)
      return new Symbol(name, ns, tags)
    else
      this.name = name
      this.ns   = ns   || null
      this.tags = tags || List.empty()
      return this

  toString: () ->
    if @ns
      '##' + @ns + '#' +@name
    else
      @name

  @isQualified: (sym) ->
    sym instanceof Symbol && sym.ns != null

  @isTagged: (sym) ->
    sym instanceof Symbol && sym.tags.size > 0

  @unqualify: (sym) ->
    new Symbol(sym.name, null, null)

  @untag: (sym) ->
    new Symbol(sym.name, null, sym.tags.tail)

  @reify: (sym) ->
    if sym instanceof Symbol && Symbol.isTagged(sym)
      new Symbol("#:" + toArray(sym.tags).join(":") + ":" + sym.name)
    else
      sym

  @swapTag:   (sym, tag) ->
    if (!sym.ns && sym.tags.head == tag)
      new Symbol(sym.name, null, sym.tags.tail)
    else
      new Symbol(sym.name, null, cons(tag, sym.tags))

  @removeTag: (sym, tag) ->
    if (!sym.ns && sym.tags.head == tag)
      new Symbol(sym.name, null, sym.tags.tail)
    else
      sym

  @ensureTag: (sym, tag) ->
    if (!sym.ns && sym.tags.head == tag)
      sym
    else
      new Symbol(sym.name, null, cons(tag, sym.tags))

class Tag
  constructor: (data) ->
    if !(this instanceof Tag)
      return new Tag(data)
    else
      this.data = data
      this.id   = Tag.nextId++
      this._uid = "<Tag: " + this.id + ">"
      return this

  toString: () -> this.id

  @nextId: 1

class List
  constructor: (head, tail, size) ->
    if !(this instanceof List)
      return new List(head, tail, size)
    else
      this.head = head
      this.tail = tail
      this.size = size
      return this

  @empty : () ->
    new List(null, null, 0)

  @create : () ->
    List.fromArray(arguments)

  @fromArray: (arr) ->
    ls = new List(null, null, 0)
    i  = arr.length
    j  = 1
    while i--
      ls = new List(arr[i], ls, j)
      j++
    ls

  @toArray: (ls) ->
    size     = ls.size
    arr      = []
    arr.size = size
    i = 0
    while i < size
      arr[i++] = ls.head
      ls = ls.tail
    arr

class Map
  constructor: (entries) ->
    if !(this instanceof Map)
      return new Map(entries)
    else
      this.entries = entries || [{}]
      return this

  @create: (kvs) ->
    map = new Map([{}])
    i   = 0
    while i < arguments.length
      key = arguments[i++]
      val = arguments[i++]
      Map.putEntry(map, toUID(key), [key, val])
    map

  @extend: (map) ->
    _entries = map.entries.slice()
    _entries.unshift({})
    new Map(_entries)

  @containsEntry: (map, uid) ->
    for entry in map.entries
      if uid of entry
        return true
    return false

  @getEntry: (map, uid, notFound) ->
    for entry in map.entries
      if uid of entry
        return entry[uid]
    return notFound

  @putEntry: (map, uid, entry) ->
    map.entries[0][uid] = entry

  @get: (map, key, notFound) ->
    result = Map.getEntry(map, toUID(key), null)
    if result then result[1] else notFound

  @contains: (map, key) ->
    Map.containsEntry(map, toUID(key))

  @put: (map, key, val) ->
    Map.putEntry(map, toUID(key), [key, val])
    i = 3
    while i < arguments.length
      key = arguments[i++]
      val = arguments[i++]
      Map.putEntry(map, toUID(key), [key, val])
    map

  @keys: (map) ->
    for [k, _] in Map.toArray(map) then k

  @vals: (map) ->
    for [_, v] in Map.toArray(map) then v

  @toArray: (map) ->
    array = []
    seen  = {}
    for e in map.entries
      for k, v of e
        if e.hasOwnProperty(k) && !seen[k]
          seen[k] = true
          array.push(e[k])
    array

  @fromArray: (array) ->
    m = new Map([{}])
    for [k, v] in array
      Map.put(m, k, v)
    m

class Set
  constructor: (map) ->
    if !(this instanceof Set)
      new Set(map)
    else
      this.map = new Map([{}])

  @put: (set, key) ->
    Map.put(set.map, key, key)
    if arguments.length > 2
      i = 2
      while i < arguments.length
        key = arguments[i]
        Map.put(set.map, key, key)
    set

  @get: (set, key, notFound) ->
    Map.get(set.map, key, notFound)

  @contains: (set, key) ->
    Map.contains(set, key)

  @toArray: (set) ->
    Map.keys(set.map)

  @fromArray: (array) ->
    set = new Set(new Map([{}]))
    for key in array
      Set.put(set, key)
    set

class Method
  constructor: (options) ->
    options ||= {}
    index   = options.index || 0
    name    = options.name  || "anonymous"

    id      = Method.NEXT_ID++
    handle  = Method.HANDLE + id + "__" + name

    method = () ->
      vtable = arguments[index]
      if      vtable == null      then vtable = Method.NULL_VTABLE
      else if vtable == undefined then vtable = Method.VOID_VTABLE

      impl = vtable[handle] || method[Method.DEFAULT]
      impl.apply(null, arguments)

    method._name = name

    method[Method.HANDLE] = handle

    method[Method.DEFAULT] = () ->
      throw Error(
        "no implementation or default for method " +
        name + " for type " + toTypeName(arguments[index])
      )

    method.extend = () ->
      Method.extend(method, arguments)

    return method

  @NEXT_ID:     1
  @NULL_VTABLE: {}
  @VOID_VTABLE: {}
  @HANDLE:      "__METHOD_HANDLE__"
  @DEFAULT:     "__DEFAULT_METHOD__"

  @extend1: (method, type, impl) ->
    if type == Method.DEFAULT
      method[Method.DEFAULT] = impl
    else
      vtable = type
      if vtable == null
        vtable = Method.NULL_VTABLE
      else if vtable == undefined
        vtable = Method.VOID_VTABLE
      else if vtable instanceof Function
        vtable = vtable.prototype
      vtable[method[Method.HANDLE]] = impl

  @extend: (method, extensions) ->
    index = 0
    while index < extensions.length
      type = extensions[index++]
      impl = extensions[index++]
      Method.extend1(method, type, impl)

$RUNTIME         = Var('*runtime*', RT)
$OUT             = Var('*out*', ((x) -> process.stdout.write(x)))
$PACKAGE         = Var('*package*')
$COMPILER_MACROS = Var('*compiler-macros*', new Map())

represent = Method(name: 'represent')
represent.extend(
  null
  (_, p, _) -> p("#nil")

  undefined
  (_, p, _) -> p("#void")

  Boolean
  (x, p, _) -> if x then p("#t") else p("#f")

  Number
  (x, p, _) -> if isNaN(x) then p("#nan") else p('' + x)

  String
  (x, p, m) -> if m then p(JSON.stringify(x)) else p(x)

  Symbol
  (x, p, m) ->
    if x.ns   then p("##" + x.ns + "#")
    if !(isEmpty(x.tags)) then p("#:" + toArray(x.tags).join(":") + ":")
    p(x.name)

  Array
  (xs, p, m) ->
    p("[")
    representArray(xs, p, m)
    p("]")

  List
  (x, p, m) ->
    p("(")
    representArray(List.toArray(x), p, m)
    p(")")

  Map
  (x, p, m) ->
    p("#<Map:")
    entries = Map.toArray(x)
    if entries.length > 0
      p(" ")
      representArray(Map.toArray(x), p, m)
    p(">")

  Set
  (x, p, m) ->
    p("#<Set:")
    entries = Set.toArray(x)
    if entries.length > 0
      p(" ")
      representArray(Set.toArray(x), p, m)
    p(">")

  Function
  (x, p, m) ->
    name = x._name || x.name
    name = if name then ':' + name else ''
    p("#<Function" + name + ">")

  Method.DEFAULT
  (x, p, _) ->
    constructor = x.constructor
    if constructor then name = constructor.name
    name = if name then name else "Object"
    str  = if x.toString &&
              x.toString != Object.prototype.toString then ' ' + x else ''
    p("#<" + name + str + ">")

)

representArray = (xs, p, m) ->
  many = false
  for x in xs
    if many then p(" ") else many = true
    represent(x, p, m)

newline = () -> $OUT()("\n")

pr  = () ->
  representArray(arguments, $OUT(), true)

prn = () ->
  representArray(arguments, $OUT(), true)
  newline()

print = () ->
  representArray(arguments, $OUT(), false)

println = () ->
  representArray(arguments, $OUT(), false)
  newline()

toUID = Method(name: 'to-uid')
toUID.extend(
  null
  (_) -> "null"

  undefined
  (_) -> "undefined"

  Boolean ->
  (x) -> '<Boolean: ' + x + '>'

  Number
  (x) -> '<Number: ' + x + '>'

  String
  (x) -> '<String: ' + x + '>'

  Array
  (x) ->
    if !x._uid
      x._uid = "<Array: " + map(toUID, x).join(" ") + ">"
    x._uid

  Tag
  (x) -> x._uid

  Symbol
  (x) ->
    if !x._uid
      x._uid = "<Symbol: #{toUID(x.name)} #{toUID(x.ns)} #{toUID(x.tags)}>"
    x._uid

  List
  (x) ->
    if !x._uid
      x._uid = "<List: " + map(toUID, List.toArray(x)).join(" ") + ">"
    x._uid

)

toType = Method(name: 'to-type')
toType.extend(
  null
  () -> null

  undefined
  () -> undefined

  Method.DEFAULT
  (x) -> x.constructor
)

toTypeName = (x) ->
  type = toType(x)
  if type == null
    "#nil"
  else if type == undefined
    "#void"
  else
    type._name || type.name || "Object"

toArray = Method(name: 'to-array')

toArray.extend(
  null
  () -> []

  String
  (s) -> for c in s then c

  Array
  (x) -> x.slice()

  List
  List.toArray

  Map
  Map.toArray

  Set
  Set.toArray

)

fromArray = (type, array) ->
  type.fromArray(array)

isEmpty = Method(name: 'empty?')
isEmpty.extend(
  undefined
  () -> true

  null
  () -> true

  String
  (s) -> s.length == 0

  Array
  (xs) -> xs.length == 0

  List
  (xs) -> xs.size == 0

  Method.DEFAULT
  (xs) -> toArray(xs).length == 0

)

size = Method(name: 'size')
size.extend(
  null
  () -> 0

  String
  (s) -> s.length

  Array
  (xs) -> xs.length

  List
  (xs) -> xs.size

  Method.DEFAULT
  (xs) -> toArray(xs).length

)

forEach = Method(name: 'for-each', index: 1)
forEach.extend(
  null
  (_, _) -> null

  String
  (f, s) ->
    for c in s then f(c)
    null

  Array
  (f, xs) ->
    for x in xs then f(x)
    null

  List
  (f, xs) ->
    while xs.size > 0
      f(xs.head)
      xs = xs.tail
    null

  Method.DEFAULT
  (f, xs) -> forEach(f, toArray(xs))

)

map = Method(name: 'map', index: 1)
map.extend(
  null
  (_, _) -> null

  String
  (f, s) ->
    buf = []
    buf.length = s.length
    for c, i in s
      buf[i] = f(c)
    buf.join("")

  Array
  (f, xs) ->
    ys = []
    ys.length = xs.length
    for x, i in xs
      ys[i] = f(x)
    ys

  List
  (f, xs) ->
    ys = []
    i  = 0

    while xs.size > 0
      ys[i] = f(xs.head)
      xs = xs.tail
      i++

    List.fromArray(ys)

  Method.DEFAULT
  (f, xs) ->
    type = toType(xs)
    type.fromArray(map(f, toArray(xs)))

)

# still debating whether or not
# to extend these to Objects

first = Method(name: 'first')
first.extend(
  null
  (_) -> null

  String
  (x) -> if x.length > 0 then x[0] else null

  Array
  (x) -> if x.length > 0 then x[0] else null

  List
  (x) -> x.head

  Method.DEFAULT
  (x) -> first(toArray(x))
)

rest = Method(name: 'rest')
rest.extend(
  null
  (_) -> null

  String
  (x) -> List.fromArray(x).tail

  Array
  (x) -> List.fromArray(x).tail

  List
  (x) -> x.tail

  Method.DEFAULT
  (x) -> List.fromArray(toArray(x)).tail
)

take = Method(name: 'take', index: 1)
take.extend(
  null
  (_) -> null

  String
  (n, s) -> s.substring(0, n)

  Array
  (n, xs) -> x.slice(0, n)

  List
  (n, xs) -> List.fromArray(List.toArray(xs).slice(0, n))
)

drop = Method(name: 'drop', index: 1)
drop.extend(
  null
  (_) -> null

  String
  (n, s) -> s.substring(n)

  Array
  (n, xs) -> x.slice(n)

  List
  (n, xs) -> List.fromArray(List.toArray(xs).slice(n))
)

takeWhile = Method({name: 'take-while', index: 1})
takeWhile.extend(
  Method.DEFAULT
  (pred, xs) ->
    res  = []
    for x in toArray(xs)
      if pred(x)
        res.push(x)
      else
        break
    res
)

dropWhile = Method({name: 'drop-while', index: 1})
dropWhile.extend(
  Method.DEFAULT
  (pred, xs) ->
    xs = toArray(xs)
    for x, i in xs
      if pred(x)
        null
      else
        return xs.slice(i)
    return []
)

get = Method(name: 'get')
get.extend(
  Map
  Map.get

  Set
  Set.get
)

put = Method(name: 'put')
put.extend(
  Map
  Map.put

  Set
  Set.put
)

contains = Method(name: 'contains')
contains.extend(
  Map
  Map.contains

  Set
  Set.contains
)

cons = Method(name: 'cons', index: 1)

cons.extend(
  String
  (x, xs) ->
    xs = List.fromArray(xs)
    new List(x, xs, xs.size+1)

  Array
  (x, xs) ->
    xs = List.fromArray(xs)
    new List(x, xs, xs.size+1)

  List
  (x, xs) -> new List(x, xs, xs.size+1)

  Method.DEFAULT
  (x, xs) ->
    xs = List.fromArray(toArray(xs))
    new List(x, xs, xs.size+1)
)

foldl = (f, x, xs) ->
  n = arguments.length
  switch n
    when 2
      xs = if x instanceof Array then x else toArray(x)
      x  = xs[0]
      i  = 1
      while i < xs.length
        x = f(x, xs[i])
        i++
      return x
    when 3
      xs = if xs instanceof Array then xs else toArray(xs)
      for y in xs
        x = f(x, y)
      return x
    else raise("foldl takes two or three args, got " + n)

partition = (n, xs) ->
  xs  = if xs instanceof Array then xs else toArray(xs)
  ys  = []
  end = xs.length
  i   = 0
  m   = 0
  while i < end
    j  = 0
    zs = []
    zs.length = n
    while j < n
      zs[j] = xs[i]
      j++
      i++
    ys[m] = zs
    m++
  return ys

_cat = (x, y) ->
  x = toArray(x)
  i = x.length
  while i--
    y.unshift(x[i])

concat = () ->
  switch arguments.length
    when 0 then []
    when 1 then toArray(arguments[0])
    else
      i    = arguments.length-1
      tail = toArray(arguments[i])
      while i--
        x = toArray(arguments[i])
        j = x.length
        while j--
          tail.unshift(x[j])
      tail

apply = (f) ->
  switch arguments.length
    when 1 then f()
    when 2 then f.apply(null, toArray(arguments[1]))
    else
      i       = arguments.length-1
      arglist = toArray(arguments[i])
      while i > 1
        i--
        arglist.unshift(arguments[i])
      f.apply(null, arglist)
