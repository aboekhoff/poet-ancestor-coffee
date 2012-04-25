sqr = (x) -> x*x

xs = List.create(1,2,3,4,5,6,7,8)
prn(xs)
prn(map(sqr, xs))
prn(map(sqr, toArray(xs)))

prn("WTF")
prn([1,2,3,4])
prn(List.create(1,2,[3,4], Symbol("foo"), "bar"))

m = new Map()
Map.put(m,
  "foo",         "bar"
  "",            "bonk"
  null,          "zonk"
  undefined,     "wank"
  0,             "donk"
  NaN,           "honk"
  42,            "pinky"
  Symbol("foo"), "blinky"
)

console.log(m.entries)

prn(get(m, "foo"))
prn(get(m, NaN))

s = "(foo [bar 1 2 (3 4 5) \"shazam!\" 'foo] 'bar)"
r = new Reader(s)
prn(r.readSexp())

s0 = new Set()

prn(s0)
Set.put(s0, 42)
Set.put(s0, 23)

console.log(Set.prototype)
console.log(Array.prototype)
prn(s0)
prn(toTypeName(s0))
prn(toArray(s0))
xs = [1 ,2 ,3 , 4, 5]
prn(xs)
prn(toArray(xs))
prn(toType(xs))
prn(toTypeName(xs))
prn(toUID(xs))

prn(map(sqr, s0))
prn(cons(42, s0))
prn(coerce(cons(42, s0), Set))
prn(coerce([[1,2],[3,4]], Map))
prn(List)
prn(cons)
prn(toArray)

ls = List.create(1,2,3,4,5)
prn(ls)
prn(first(ls))
prn(rest(ls))
prn(rest([1,2,3]))
prn(rest("foo bar baz"))

console.log(new Env())
console.log(Package.get(baseNS))

prn(Package.get(baseNS).env.vars)