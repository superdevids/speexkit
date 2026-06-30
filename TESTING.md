# 🔥 SPEEXKIT BRUTAL TESTING GUIDE

> **Warning:** This is NOT a gentle introduction. This is the gauntlet.
> Every module in speexkit must pass every test below before any release.
> Zero tolerance. Zero exceptions.

---

## 📋 TABLE OF CONTENTS

1. [Philosophy](#-philosophy)
2. [Universal Attack Vectors](#%EF%B8%8F-universal-attack-vectors)
3. [Boundary & Edge Hell](#-boundary--edge-hell)
4. [Hidden & Brutal Attacks Per Module](#-hidden--brutal-attacks-per-module)
5. [Cross-Module Corruption Tests](#-cross-module-corruption-tests)
6. [Build & TypeScript Fortress](#-build--typescript-fortress)
7. [Performance & Memory Gauntlet](#-performance--memory-gauntlet)
8. [Chaos Engineering](#-chaos-engineering)
9. [Security Penetration Suite](#-security-penetration-suite)
10. [Mutation Testing](#-mutation-testing)
11. [Regression Lockdown](#-regression-lockdown)
12. [CI/CD Boss Fight](#-cicd-boss-fight)

---

## 🧠 PHILOSOPHY

| Rule | Description |
|------|-------------|
| **Zero Runtime Deps** | Any test that introduces an external dependency fails instantly |
| **100% Coverage Floor** | Every `if` branch, every `catch`, every edge guard must be hit |
| **Brutal First** | Test the impossible before testing the expected |
| **No Sympathy Tests** | Tests that never fail are worthless — delete them |
| **TypeScript Strict** | `noUncheckedIndexedAccess` violations are caught before runtime |
| **Immutable by Default** | Tests proving mutation of inputs = automatic fail |

---

## ⚔️ UNIVERSAL ATTACK VECTORS

Every function, every export, every class. No exceptions.

### Null / Undefined Assault

```bash
npm test -- --grep "should handle null"
```

```typescript
// Every function must be called with:
func(null)
func(undefined)
func.apply(null, [arg1, arg2])
func.call(undefined, arg1)
```

### NaN / Infinity Injection

```typescript
func(NaN)
func(Infinity)
func(-Infinity)
func(0/0)
func(1/0)
func(-1/0)
```

### Empty Everything

```typescript
func("")           // Empty string
func([])           // Empty array
func({})           // Empty object
func(new Set())    // Empty Set
func(new Map())    // Empty Map
func(Buffer.alloc(0)) // Empty Buffer
```

### Type Confusion Matrix

| Input Type | Expected Behavior |
|------------|------------------|
| `"42"` (numeric string) | Coerced or rejected? |
| `42` (number) | Must not throw if object expected |
| `true` / `false` | Boolean coerced to 1/0? |
| `Symbol("x")` | Must not crash |
| `BigInt(42)` | Must not crash |
| `() => {}` | Function treated as value? |
| Proxy object | Trap detection? |

### Prototype Pollution

```typescript
func("__proto__", "polluted")
func("constructor.prototype.polluted", true)
func(Object.create(null))  // Null-prototype object
func(JSON.parse('{"__proto__": {"polluted": true}}'))
```

### Recursive / Cyclic Structures

```typescript
const a: any = {}; a.self = a;
func(a)

const b: any = []; b[0] = b;
func(b)

const c: { x?: any } = {}; c.x = c;
func(c)
```

### Maximum Call Stack

```typescript
// Deeply nested (10,000+ levels)
func(buildDeepNested(10000))
func(Array.from({ length: 10000 }, (_, i) => ({ id: i, parent: i > 0 ? i - 1 : null })))
```

### Unicode / Encoding Attacks

```typescript
func("\u0000")                  // Null byte
func("\uFFFE")                  // Non-character
func("\uFEFF")                  // BOM
func("a\u0300\u0301\u0302")    // Combining diacritics
func("\uD800\uDC00")           // Surrogate pair
func("\u202E\u202D")           // BiDi override
func("﻿<script>")  // Zero-width no-break space + XSS
```

### Negative Zero / Object.is

```typescript
func(-0)
Object.is(func(0), func(-0))  // Should preserve -0 if meaningful
```

---

## 🔲 BOUNDARY & EDGE HELL

### Integer Boundaries

```typescript
Number.MIN_SAFE_INTEGER  // -9,007,199,254,740,991
Number.MAX_SAFE_INTEGER  // 9,007,199,254,740,991
Number.MAX_VALUE         // 1.7976931348623157e+308
Number.MIN_VALUE         // 5e-324
Math.pow(2, 31) - 1      // Int32 max
Math.pow(2, 31)          // Int32 max + 1
Math.pow(2, 63) - 1      // Int64 max
```

### Array Length Extremes

```typescript
func(Array(0))         // Empty
func(Array(1))         // Single element
func(Array(2**32 - 1)) // Max array length (would OOM? guard!)
```

### String Length Extremes

```typescript
"".repeat(0)           // Empty
"x".repeat(1)          // Single char
"x".repeat(10000)      // 10K chars
"x".repeat(100000)     // 100K chars
"x".repeat(1000000)    // 1M chars — should not crash
```

---

## 🎯 HIDDEN & BRUTAL ATTACKS PER MODULE

### 1. `events` — EventEmitter & EventBus

```bash
npm test -- tests/events.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `emit("")` (empty event name) | Guard or documented behavior |
| `emit("*")` (wildcard name) | Should not trigger all events |
| `emit()` (no args) | Should not throw |
| `emit("event", null, undefined, NaN)` | Pass through correctly |
| `on("event", 123)` (non-function listener) | Throw TypeError |
| `on("event", f)` then `emit("EVENT")` (case mismatch) | No trigger |
| `on("error", f)` then `emit("error", err)` | Custom error handler |
| Remove listener while iterating | No crash, no double-fire |
| Add 10000 listeners then emit | No memory leak warning |
| `emit("newListener")` | Should not infinite-loop |
| Maximum listener warning (default 10) | Console warning |
| `once("event", f)` call twice | f called once only |
| `removeAllListeners()` then `emit` | Nothing fires |
| EventBus `publish("x")` with no subscribers | Silent no-op |
| EventBus `publish("")` with subscribers | Edge case |
| EventBus `publish` while subscriber is unsubscribing | No crash |
| `listeners("event")` returns copy | Mutation of result should not affect internal state |
| `eventNames()` includes symbols | Symbol-keyed events |

### 2. `cache` — LRU, LFU, TTL, memoize

```bash
npm test -- tests/cache.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `new LRUCache(0)` (zero capacity) | No entries ever stored |
| `new LRUCache(-1)` | Throw or fallback to 1 |
| `new LRUCache(Infinity)` | Throw or handle |
| `new LRUCache(1.5)` (fractional) | Floor/ceil to integer |
| `set("key", undefined)` | Store undefined value |
| `set("key", null)` | Store null value |
| `set("key", NaN)` | Store NaN correctly |
| `set("")` (empty key) | Not crash |
| `get("nonexistent")` | Return undefined, not throw |
| `set` over capacity — eviction order | LRU: least recently used. LFU: least frequent |
| `set` same key twice — update value | Value updated, position updated in LRU |
| `has("")` (empty key) | Boolean, not throw |
| `clear()` then `get` | All entries gone |
| `delete("")` on empty key | Not throw |
| Memoize with async function | Return Promise |
| Memoize with throwing function | Error propagates, not cached |
| Memoize `undefined` cache key | Not crash |
| TTL cache: entry expires mid-read | Not return expired |
| TTL cache: 0ms TTL | Expires instantly |
| TTL cache: negative TTL | Throw or treat as 0 |
| CacheStatsCollector: `getStats` after 0 ops | Zeroes not undefined |
| LRU: access evicted item | undefined, not throw |
| LFU: frequency ties on eviction | Deterministic (FIFO tiebreaker) |

### 3. `resilience` — CircuitBreaker, Bulkhead, Retry, Fallback, Timeout

```bash
npm test -- tests/resilience.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| CircuitBreaker: `call` while OPEN | Throws/fast-fails |
| CircuitBreaker: HALF_OPEN success → CLOSED | Transition + reset |
| CircuitBreaker: HALF_OPEN failure → OPEN | Transition |
| CircuitBreaker: 0 threshold | Always open |
| CircuitBreaker: Infinity threshold | Never opens |
| CircuitBreaker: timeout < 0 | Throw |
| CircuitBreaker: success after OPEN timer — should HALF_OPEN | Auto transition |
| Bulkhead: 0 maxConcurrent | All calls rejected |
| Bulkhead: -1 maxConcurrent | Throw or fallback |
| Bulkhead: queued call > queue size | Rejected |
| Bulkhead: call completes → next queued runs | Queue draining works |
| Retry: 0 retries → calls once | No retry |
| Retry: -1 retries | Throw |
| Retry: all fail → throws last error | Propagation |
| Retry: custom retryIf → condition decides | Selective retry |
| Retry: exponential backoff → delay grows | Verify delay pattern |
| Fallback: function returns → fallback not called | No unnecessary call |
| Fallback: function throws → fallback returns | Graceful degradation |
| Fallback: function + fallback both throw | Final error |
| Fallback: async → await | Promise handling |
| Timeout: completes before deadline → returns result | Normal flow |
| Timeout: exceeds deadline → throws TimeoutError | Timely failure |
| Timeout: 0ms → immediate timeout | Instant failure |
| Timeout: negative → throw | Guard |
| Timeout: nested with CircuitBreaker | Composable |

### 4. `auth` — JWT, PKCE, Basic Auth

```bash
npm test -- tests/auth.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `signJWT("", payload)` (empty secret) | Should it work? |
| `signJWT("secret", null)` | Throw |
| `signJWT("secret", 123)` (non-object) | Throw or coerce |
| `signJWT("secret", {})` (empty payload) | Valid token with empty claims |
| `verifyJWT("invalid.token.here")` | Return null / throw |
| `verifyJWT("")` (empty string) | Return null |
| `verifyJWT("a.b")` (only 2 parts) | Malformed |
| `verifyJWT("a.b.c.d")` (4 parts) | Malformed |
| `verifyJWT(token, wrongSecret)` | Signature mismatch |
| `verifyJWT(expiredToken)` | Return null / expired error |
| `verifyJWT(tokenWithBadAlg)` | Reject non-HS256 |
| `decodeJWT(invalidBase64)` | Throw gracefully |
| `decodeJWT("...")` all parts empty | Not crash |
| `generatePKCE(0)` (zero length) | Throw or minimum |
| `generatePKCE(-1)` | Throw |
| `generatePKCE(Infinity)` | OOM guard? |
| PKCE pairing | `verifyChallenge(verifier, challenge)` = true |
| `parseBasicAuth("")` | Return null |
| `parseBasicAuth("Basic xyz")` | Not basic? |
| `parseBasicAuth("Basic " + btoa(":"))` | Empty user:pass |
| `parseBasicAuth("Basic " + btoa("user"))` | No colon |
| `parseBasicAuth("Bearer token")` | Not basic → null |
| Replay protection: same token verified twice | Should both succeed |
| Token with `nbf` in future | Should reject |

### 5. `schema` — Zod-Lite Validator

```bash
npm test -- tests/schema.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `s.string().parse(123)` | Fail |
| `s.number().parse("abc")` | Fail |
| `s.boolean().parse(1)` | Coerce? Or fail |
| `s.array(s.number()).parse(["1", "2"])` | Fail (strings) |
| `s.array(s.number()).parse([1, 2, "3"])` | Fail on "3" |
| `s.object({ name: s.string() }).parse(null)` | Fail |
| `s.object({ name: s.string() }).parse(undefined)` | Fail |
| `s.object({}).parse(null)` | Fail (should guard) |
| `s.object({ a: s.number() }).parse({ a: undefined })` | Fail if not optional |
| `s.object({ a: s.optional(s.number()) }).parse({})` | Pass (a optional) |
| `s.object({ a: s.number() }).parse({ a: 5, extra: true })` | Pass or strip? |
| `s.string().parse(undefined)` | Fail |
| `s.string().parse(null)` | Fail |
| `s.number().parse(NaN)` | Fail (NaN is not number) |
| `s.number().parse(Infinity)` | Pass or fail? |
| `s.literal("hi").parse("hello")` | Fail |
| `s.literal(42).parse("42")` | Fail (type mismatch) |
| `s.enum(["a", "b"]).parse("c")` | Fail |
| `s.enum([]).parse("anything")` | Fail (empty enum) |
| `s.union([s.string(), s.number()]).parse(true)` | Fail |
| `s.nullable(s.string()).parse(null)` | Pass |
| `s.nullable(s.string()).parse(undefined)` | Fail (nullable ≠ optional) |
| Nested object: 10 levels deep | Works |
| Self-referencing schema (if supported) | Not crash |
| `Infer<typeof schema>` — compile-time type matches runtime | TypeScript check |

### 6. `storage` — Universal Storage

```bash
npm test -- tests/storage.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `memoryDriver.get("")` (empty key) | Not crash |
| `memoryDriver.get(null)` (invalid key) | Throw or return undefined |
| `memoryDriver.set("", "")` | Store empty key |
| `memoryDriver.delete("nonexistent")` | No-op |
| `memoryDriver.clear()` | All gone |
| `localStorageDriver` in non-browser env | Throw clear error |
| `cookieDriver` in non-browser env | Throw clear error |
| `storage.set("key", undefined)` | Store undefined |
| `storage.set("key", null)` | Store null |
| `storage.set("key", { nested: { deep: [1,2,3] } })` | Deep object stored |
| `storage.set("key", function f(){})` | Functions? |
| `storage.set("key", Symbol("sym"))` | Symbols? |
| `storage.set("key", new Date())` | Date serialization? |
| `createStorage()` with no driver | Throw |
| `createStorage(memoryDriver()).set("k", "v").get("k")` | Chainable? |
| Set + get 10,000 entries | Performance baseline |

### 7. `state-machine` — FSM

```bash
npm test -- tests/state-machine.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `createMachine({})` (no states) | Throw |
| `createMachine({ initial: "idle", states: {} })` (no transitions) | Stuck forever |
| `createMachine({ initial: "missing", states: { idle: {} } })` initial missing | Throw |
| `send("")` (empty event) | Not crash |
| `send("nonexistent")` | No-op or throw |
| `send("event from wrong initial state")` | Should be ignored |
| `subscribe(() => {}, "nonexistent")` | Never fires |
| `subscribe(null)` (invalid callback) | Throw |
| `subscribe(f)` then unsubscribe → `send` | No callback |
| `can("")` (empty event) | Boolean |
| `can("")` on unknown state | false |
| Entry action throws | Error propagates? |
| Multiple transitions: a→b→c→a | Full cycle works |
| Final state: `send` after final | No-op or throw |
| Guard function returns false | Transition blocked |
| Guard function throws | Error handled? |
| `matches("")` (empty) | false |
| `matches` on string vs array | Any match? |
| `value` returns frozen state object | Readonly |

### 8. `structures` — Trie, Graph, Heap, PriorityQueue, etc.

```bash
npm test -- tests/structures.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `new Trie()` → `has("")` | false |
| `new Trie()` → `has(null)` | Throw or false |
| `Trie.add("")` → `has("")` | true? depends |
| `Trie.add("a")` then `delete("")` | Don't delete 'a' |
| `Trie.wordsWithPrefix("")` | All words |
| `Trie.wordsWithPrefix("nonexistent")` | Empty array |
| `Trie.wordsWithPrefix(null)` | Throw or empty |
| `new Graph()` → `addEdge("a", "b")` (no addVertex) | Auto-create? |
| `Graph.hasVertex("")` | false or true? |
| `Graph.removeVertex("")` (doesn't exist) | No-op |
| `Graph.shortestPath("", "b")` when empty | Null |
| `Graph.shortestPath("a", "a")` | 0-length path |
| `Graph.shortestPath("a", "a")` with self-loop | Empty path |
| Graph with cycle → shortestPath | Should not infinite-loop |
| `Graph.shortestPath("a", "z")` (no path) | Null |
| `new Heap()` → `pop()` (empty) | undefined, not crash |
| `Heap.push(undefined)` | Throw or skip |
| `Heap.push(NaN)` | Comparison will fail |
| `new PriorityQueue()` → `dequeue()` (empty) | undefined |
| `PriorityQueue.enqueue("a", NaN)` | Priority NaN |
| `new LinkedList()` → iterator on empty | No items |
| `LinkedList.append(undefined)` | Node with undefined value |
| `LinkedList.remove("")` | Not crash |
| `Deque.pushFront` / `popBack` on empty | undefined |
| `DisjointSet.find("")` | Not crash |
| `DisjointSet.union(1, 2)` then `connected` | true → until reset |
| `BloomFilter.add("")` | Works |
| `BloomFilter.has("")` | Possibly false positive |
| `BloomFilter` with 0 capacity | Throw |
| `BloomFilter` error rate check: `~0.01` | Measured false positive rate |
| `BloomFilter` 10000 items = 0 false negatives | Guarantee |

### 9. `mock` — Fake Data Generator

```bash
npm test -- tests/mock.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `fakeName()` returns non-empty string | Always |
| `fakeName()` called 10000x → no duplicates check | But reasonable distribution |
| `fakeEmail()` valid format | Contains `@` and domain |
| `fakePhone()` correct format | Digits only, proper length |
| `fakeUUID()` format | `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` |
| `fakeAddress()` contains street, city, country | Object with keys |
| `fakeLorem(0)` | Empty string |
| `fakeLorem(-1)` | Throw or empty |
| `fakeSentence(0)` | Empty |
| `fakeParagraph(0)` | Empty |
| `fakeParagraph(-1)` | Throw |
| `fakeFromSchema(s.number())()` returns number | Runtime match |
| `fakeFromSchema(s.string())()` returns string | Runtime match |
| `fakeFromSchema(s.boolean())()` returns boolean | Runtime match |
| `fakeFromSchema(s.array(s.number()))()` | Array of numbers |
| `fakeFromSchema(s.object({ n: s.number() }))()` | Object { n: number } |
| `fakeInt(5, 5)` (min=max) | Returns 5 |
| `fakeInt(10, 5)` (min>max) | Swap or throw |
| `fakeFloat(0, 1)` | Between 0 and 1 |
| `fakeFloat(0, 0)` (zero range) | Returns 0 |
| `fakeBoolean()` — 50/50? | Roughly equal after 10000 calls |
| `fakeDate(new Date(2020,0,1), new Date(2020,0,1))` (same date) | Returns that date |
| `fakeDate(new Date(2020,0,1), new Date(2019,0,1))` (invalid range) | Throw |
| `fakeColor()` valid hex | `#RRGGBB` |
| `fakeColor()` all 16777216 values reachable | Eventually |
| `fakeURL()` | Valid URL string |
| `fakeAvatar()` | URL string |
| `seedRandom(42)` deterministic | Same sequence twice = same values |
| `seedRandom` undefined/null | Random fallback |
| `fakeLorem(1000)` | 1000 words returned |

### 10. `diff` — Myers Diff, Object Diff, Patch

```bash
npm test -- tests/diff.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `textDiff("", "")` | Empty diff |
| `textDiff("a", "")` | Removal |
| `textDiff("", "a")` | Addition |
| `textDiff("a", "a")` | No changes |
| `textDiff("abc", "abd")` | Single char change |
| `textDiff("x".repeat(10000), "y".repeat(10000))` | Large diff, no OOM |
| `objectDiff({}, {})` | Empty diff |
| `objectDiff(null, {})` | Throw or handle |
| `objectDiff(undefined, {})` | Throw or handle |
| `objectDiff({ a: 1 }, { a: "1" })` | Type change detected |
| `objectDiff({ a: null }, { a: undefined })` | Null vs undefined |
| `objectDiff({ a: { b: 1 } }, { a: { b: 2 } })` | Nested diff |
| `objectDiff({ a: [1,2,3] }, { a: [1,2,4] })` | Array diff |
| `patch("hello", diffChunk)` | Applies correctly |
| `patch("", diffChunk)` (empty string) | Works |
| `patch(null, ...)` | Throw |
| `unifiedDiff("a\nb\nc", "a\nx\nc")` | Unified format |
| `objectDiff(cyclic, cyclic2)` | Handle cycle or throw safely |

### 11. `queue` — JobQueue, Cron, Debouncer

```bash
npm test -- tests/queue.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `new JobQueue(0)` (zero concurrency) | All queued, none run |
| `new JobQueue(-1)` | Throw |
| `new JobQueue(Infinity)` | Cap at reasonable limit |
| `queue.add(() => throw new Error())` | Error caught, not crash |
| `queue.add(() => throw new Error())` then `onError` | Error handler called |
| `queue.add(async () => { throw new Error() })` | Promise rejection handled |
| `queue.add(null)` | Throw |
| `queue.add(undefined)` | Throw |
| `queue.add("not function")` | Throw |
| `queue.pause()` then `add` | Queued, not running |
| `queue.pause()` then `resume()` | Starts processing |
| `queue.getPending()` after `add` | Includes new job |
| `queue.clear()` | All pending removed |
| `queue.clear()` while running | Running jobs finish |
| `cron("* * * * * *", fn)` (every second) | Fires repeatedly |
| `cron("invalid cron", fn)` | Throw |
| `cron("*/0 * * * *", fn)` | Division by zero guard |
| `scheduleEvery(0, fn)` | Fire in loop? Guard |
| `scheduleEvery(-100, fn)` | Throw |
| `scheduleEvery(Infinity, fn)` | Never fires |
| `Debouncer.immediate("key", fn, 0)` | Instant |
| `Debouncer.immediate("key", fn, -1)` | Instant or throw |
| `Debouncer.immediate("key", fn, 100)`, call 2x in 50ms | Debounced to 1 call |
| `Debouncer.cancel("")` (empty key) | No-op |
| `Debouncer.cancel("nonexistent")` | No-op |
| `Debouncer.flush("")` with pending | Runs immediately |
| `queue` with 1000 jobs | Order preserved |
| `queue` concurrent jobs = maxConcurrency | Not exceeded |

### 12. `intl` — Internationalization

```bash
npm test -- tests/intl.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `formatNumber(NaN)` | Fallback or formatted NaN |
| `formatNumber(Infinity)` | ∞ symbol or fallback |
| `formatNumber(-Infinity)` | -∞ symbol |
| `formatNumber(1e-7)` (very small) | Correct locale format |
| `formatCurrency(0, "USD")` | `$0.00` |
| `formatCurrency(-1.5, "EUR")` | `-€1.50` |
| `formatCurrency(NaN, "USD")` | Handle gracefully |
| `formatCurrency(100, "XYZ")` (invalid currency) | Handle |
| `formatRelativeTime(-1, "day")` | "yesterday" / "1 day ago" |
| `formatRelativeTime(0, "hour")` | "now" / "this hour" |
| `formatRelativeTime(Infinity, "year")` | Max value guard |
| `formatList([])` | Empty string |
| `formatList(["a"])` | "a" |
| `formatList(["a", "b", "c"], "or")` | "a, b, or c" |
| `pluralize(0, "cat")` | "cats" |
| `pluralize(1, "cat")` | "cat" |
| `pluralize(Infinity, "cat")` | Handled |
| `pluralize(NaN, "cat")` | Fallback |
| `createTranslator({})` (empty locale) | Returns keys |
| `createTranslator({ hello: "Hola" }).t("hello")` | "Hola" |
| `createTranslator({ hello: "Hola" }).t("nonexistent")` | Returns key |
| `timeAgo(Date.now() - 5000)` | "5 seconds ago" |
| `timeAgo(Date.now() + 5000)` | "in 5 seconds" |
| `timeAgo(0)` (epoch) | Big delta, reasonable output |
| `timeAgo(null)` | Throw or handle |

### 13. `cli` — parseArgs, Spinner, Table

```bash
npm test -- tests/cli.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `parseArgs([])` | `{ _: [] }` |
| `parseArgs(["--"])` | `{ _: [] }` with `--` |
| `parseArgs(["--name=value"])` | `{ name: "value", _: [] }` |
| `parseArgs(["--name"])` (no value) | `{ name: true, _: [] }` |
| `parseArgs(["-a", "-b", "-c"])` | Multiple short flags |
| `parseArgs(["-abc"])` | Combined short flags |
| `parseArgs(["---invalid"])` | Treat as value? |
| `parseArgs(["--", "--name"])` | After `--` is literal |
| `parseArgs(null)` | Throw |
| `parseArgs(undefined)` | Throw |
| `Spinner` start/stop 2x | No double-start issues |
| `Spinner` text multi-byte | Unicode width handled |
| `Table.render([])` (empty data) | Header only or empty |
| `Table.render([{ a: 1 }])` (no headers list) | Auto-headers |
| `Table.render([{}])` | Empty row |
| `Table.render(null)` | Throw |
| `Table.render([{ a: "x".repeat(1000) }])` | Cell truncation? |
| `colorize("text", "red")` → ANSI codes | `\x1b[31mtext\x1b[0m` |
| `colorize("text", "invalid")` → no color | Passthrough |
| `colorize("", "red")` | Empty colored string |
| `confirm("y")` | true |
| `confirm("n")` / `confirm("no")` | false |
| `confirm("")` / `confirm("invalid")` | Default/false |
| `prompt("> ", "default")` → returns transformed | Works |

### 14. `geo` — Geography

```bash
npm test -- tests/geo.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `haversineDistance(0,0,0,0)` | 0 |
| `haversineDistance(90,0,-90,0)` (pole to pole) | ~20,000 km |
| `haversineDistance(0,0,0,180)` (antipodal equator) | ~20,000 km |
| `haversineDistance(91,0,0,0)` (invalid lat) | 91° out of range |
| `haversineDistance(-91,0,0,0)` | -91° out of range |
| `haversineDistance(0,181,0,0)` | 181° out of range |
| `haversineDistance(NaN, 0, 0, 0)` | NaN → result? |
| `isPointInPolygon([0,0], [])` | false |
| `isPointInPolygon([0,0], [[0,0],[1,0],[1,1],[0,1]])` | true |
| `isPointInPolygon([0,0], [[0,0],[1,0],[1,1],[0,1],[0,0]])` (closed poly) | true |
| `isPointInPolygon([2,2], [[0,0],[1,0],[1,1],[0,1]])` | false |
| `isPointInPolygon([0,0], null)` | Throw |
| `boundingBox([[0,0],[1,1],[2,2]])` | `{ minLat, maxLat, minLng, maxLng }` |
| `boundingBox([])` (empty) | Throw or null |
| `boundingBox([[0,0]])` (single point) | Identity |
| `geohash(0,0,1)` → single char | Valid geohash |
| `geohash(0,0,0)` (precision 0) | Throw |
| `geohash(90,180,12)` | Extreme corner |
| `decodeGeohash(encodeGeohash(0,0,12))` | Round-trip within error |
| `decodeGeohash("")` (empty) | Throw |
| `decodeGeohash("invalid")` (bad chars) | Throw |
| `toDMS(0, false)` | `0° 0' 0" N` or `0° 0' 0"` |
| `toDMS(-90, false)` | `90° 0' 0" S` |
| `toDMS(180, true)` | `180° 0' 0" E` |
| `toDMS(NaN, false)` | Handle |
| `midpoint([0,0],[0,0])` | [0,0] |
| `midpoint([0,0],[0,180])` | Equatorial midpoint |
| `midpoint([90,0],[90,0])` (north pole) | [90,0] |
| `midpoint([0,0],[1e-10,1e-10])` | ~[0,0] |

### 15. `units` — Unit Conversion

```bash
npm test -- tests/units.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `convert(1, "meter", "meter")` | 1 |
| `convert(1, "meter", "kilometer")` | 0.001 |
| `convert(0, "meter", "kilometer")` | 0 |
| `convert(1, "celsius", "fahrenheit")` | 33.8 |
| `convert(0, "celsius", "kelvin")` | 273.15 |
| `convert(1, "meter", "foot")` | ~3.28084 |
| `convert(1, "kilogram", "pound")` | ~2.20462 |
| `convert(1, "meter", "second")` (cross-category) | Throw |
| `convert(1, "meter", "")` (empty target) | Throw |
| `convert(1, "", "meter")` (empty source) | Throw |
| `convert(NaN, "meter", "foot")` | NaN or throw |
| `convert(Infinity, "meter", "foot")` | Infinity |
| `convert(-1, "meter", "foot")` | -3.28084 |
| `convert(1000, "byte", "gigabyte")` | 0.000000931 (binary) or 0.000001 (decimal) |
| `getUnitCategory("meter")` | "length" |
| `getUnitCategory("nonexistent")` | null |
| `isConvertible("meter", "foot")` | true |
| `isConvertible("meter", "kilogram")` | false |
| `isConvertible("meter", "nonexistent")` | false |
| `UNIT_CATEGORIES` includes length, mass, temperature, etc. | All 7+ categories |
| Temperature cross: `convert(100, "celsius", "fahrenheit")` | 212 |
| Temperature cross: `convert(212, "fahrenheit", "celsius")` | 100 |
| Temperature: absolute zero `convert(-273.15, "celsius", "kelvin")` | 0 |

### 16. `http` — HTTP Client

```bash
npm test -- tests/http.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `createHttpClient()` → no base URL | Works with absolute URLs |
| `createHttpClient({ baseUrl: "" })` | Works |
| `client.get("")` (empty path) | Fetch from baseUrl |
| `client.get({})` (invalid URL) | Throw |
| `client.get(123)` (invalid) | Throw |
| `client.get(null)` | Throw |
| `client.get("http://nonexistent.invalid")` | Reject with fetch error |
| `client.get("https://httpstat.us/404")` | 404 → HttpError |
| `client.get("https://httpstat.us/500")` | 500 → HttpError |
| `client.get("https://httpstat.us/301", { redirect: "manual" })` | 301 handled |
| Interceptor modifies headers | All requests use modified headers |
| Interceptor retries on 429 | Rate limit handled |
| RateLimitMiddleware: 0 requests/min | All blocked |
| RateLimitMiddleware: function within limit | 2nd allowed |
| RateLimitMiddleware: function over limit | Throws |
| POST with body: `client.post("/x", { body: { a: 1 } })` | JSON body |
| POST with empty body | Works |
| `client("GET", "url")` vs `client.get("url")` | Same behavior |
| Timeout option | Aborts on delay |

### 17. `security` — Sanitize, CSRF, RateLimit, Secrets, PII

```bash
npm test -- tests/security.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `sanitizeHtml("<script>alert(1)</script>")` | `alert(1)` (script removed) |
| `sanitizeHtml("<img src=x onerror=alert(1)>")` | `<img src="x">` |
| `sanitizeHtml("<a href=\"javascript:alert(1)\">click</a>")` | `<a>click</a>` (href removed) |
| `sanitizeHtml("")` | "" |
| `sanitizeHtml(null)` | Throw |
| `sanitizeHtml("<b>bold</b>")` | `<b>bold</b>` |
| `sanitizeHtml("<style>body{color:red}</style>")` | Style removed |
| `sanitizeHtml("<!--[if IE]>IE only<![endif]-->")` | Conditional comments removed |
| `sanitizeHtml("<svg><animate onbegin=alert(1)></svg>")` | SVG attack blocked |
| `sanitizeHtml("<<script>script>alert(1)</script>")` | Double-encoded attack |
| `csrfToken()` → `verifyCsrfToken(token, token)` | true |
| `csrfToken()` → `verifyCsrfToken(token, "wrong")` | false |
| `csrfToken()` → `verifyCsrfToken("", token)` | false |
| `csrfToken()` → `verifyCsrfToken(token, "")` | false |
| `csrfToken()` → `verifyCsrfToken(null, token)` | false |
| `createRateLimiter(0)` (0 window) | All blocked |
| `createRateLimiter(-1)` | Throw |
| `createRateLimiter(100).check("key")` → true | Under limit |
| `createRateLimiter(1).check("key")` → true, then 2nd → false | Over limit |
| `createRateLimiter(10).reset("key")` | Counter reset |
| `detectSecrets("sk-1234567890abcdef")` | Matches OpenAI key pattern |
| `detectSecrets("-----BEGIN PRIVATE KEY-----...")` | Private key detected |
| `detectSecrets("AKIAIOSFODNN7EXAMPLE")` | AWS key detected |
| `detectSecrets("password=secret123")` | Might detect |
| `detectSecrets("")` | Empty result |
| `detectSecrets("just normal text")` | No secrets |
| `maskPII("user@example.com")` | `u***@example.com` |
| `maskPII("08123456789")` | Masked phone |
| `maskPII("")` | Empty |
| `maskPII(null)` | Throw or return null |

### 18. `config` — Multi-Source Config

```bash
npm test -- tests/config.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `loadConfig({ sources: [] })` (no sources) | `{}` |
| `loadConfig({ sources: [fileSource("nonexistent.json")] })` | Silent skip |
| `loadConfig({ sources: [envSource()] })` | Environment vars |
| `loadConfig({ sources: [envSource({ prefix: "APP_" })] })` | Prefixed vars |
| `loadConfig({ sources: [cliSource()] })` | CLI args |
| `loadConfig({ sources: [objectSource({ key: "value" })] })` | Object source |
| Source priority: later sources override earlier | Merge order correct |
| `maskSecrets({ password: "secret123" }, ["password"])` | `{ password: "***" }` |
| `maskSecrets({ nested: { key: "secret" } }, ["nested.key"])` | Deep mask |
| `maskSecrets({}, ["key"])` | Empty unchanged |
| `maskSecrets(null, ["key"])` | Throw |
| `watchConfig(path, callback)` → file change fires callback | Callback called |
| `watchConfig("", callback)` | Throw |
| Config with nested keys: `{ a: { b: 2 } }` vs `{ "a.b": 2 }` | Consistent |
| Merge arrays: `{ items: [1] }` + `{ items: [2] }` | Replace or concat? |

### 19. `observability` — Metrics & Tracing

```bash
npm test -- tests/observability.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `Counter.inc()` → `Counter.getValue()` | 1 |
| `Counter.inc(-1)` | Decrement (if allowed) |
| `Counter.inc(NaN)` | NaN → skip or guard |
| `Counter.inc(Infinity)` | Guard |
| `Counter.reset()` | 0 |
| `Gauge.set(100)` → `getValue()` | 100 |
| `Gauge.set(NaN)` | Guard |
| `Histogram.record(100)` → `Histogram.percentile(0.5)` | ~100 |
| `Histogram.record(0)` | 0 recorded |
| `Histogram.record(-1)` | Negative allowed? |
| `Histogram.record(NaN)` | Guard |
| `Histogram.percentile(0)` | Min value |
| `Histogram.percentile(1)` | Max value |
| `Histogram.percentile(1.5)` (out of range) | Cap or throw |
| `MetricsRegistry.getMetrics()` after `Counter.inc()` | Counter in metrics |
| `MetricsRegistry.register(null)` | Throw |
| `MetricsRegistry.clear()` | All empty |
| `withCorrelationId("abc", () => getCorrelationId())` | "abc" |
| `withCorrelationId("", () => getCorrelationId())` | Empty correlation |
| `withCorrelationId(undefined, fn)` | Random generated |
| `setCorrelationId("abc")` → then `getCorrelationId()` | "abc" |
| `toOTLPJson({ metrics: [...] })` | Valid OTLP JSON format |
| `toOTLPJson({})` (empty) | Empty OTLP |
| Multiple Histogram records (0, 50, 100, 150, 200) | Percentile accuracy |

### 20. `realtime` — WebSocket & SSE Client

```bash
npm test -- tests/realtime.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `createWSClient("ws://nonexistent.invalid")` → rejects | Connection error |
| `createWSClient("")` (empty URL) | Throw |
| `createWSClient("invalid-protocol://x")` | Throw |
| `createWSClient("wss://echo.example.com")` → `close()` | Clean close |
| `createWSClient` auto-reconnect 5x → each fails | Gives up after maxRetries |
| `createWSClient` heartbeat: ping → pong | Connection maintained |
| `createWSClient` heartbeat timeout → reconnect | Auto-recovery |
| `createSSEClient("http://nonexistent.invalid")` | Fetch error handled |
| `createSSEClient("")` | Throw |
| SSE client reconnection on stream drop | Auto-reconnect |
| SSE `Last-Event-ID` header sent on reconnect | Correct value |
| Message queue: messages sent before connection | Queued, sent on connect |
| `close()` then `send()` | No-op or error |

### 21. `serialize` — MessagePack & base58/62

```bash
npm test -- tests/serialize.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `encodeMsgPack(null)` → `decodeMsgPack` → null | Round-trip |
| `encodeMsgPack(undefined)` → `decodeMsgPack` → undefined | Round-trip |
| `encodeMsgPack("")` → `decodeMsgPack` → "" | Round-trip |
| `encodeMsgPack(0)` → `decodeMsgPack` → 0 | Round-trip |
| `encodeMsgPack(-1)` → `decodeMsgPack` → -1 | Round-trip |
| `encodeMsgPack(Infinity)` → `decodeMsgPack` → Infinity | Round-trip |
| `encodeMsgPack(-Infinity)` → `decodeMsgPack` → -Infinity | Round-trip |
| `encodeMsgPack(NaN)` → `decodeMsgPack` → NaN | Round-trip (or null) |
| `encodeMsgPack(true)` → `decodeMsgPack` → true | Round-trip |
| `encodeMsgPack({ a: 1 })` → `decodeMsgPack` → `{ a: 1 }` | Round-trip |
| `encodeMsgPack([])` → `decodeMsgPack` → `[]` | Round-trip |
| `encodeMsgPack([1, "a", null, {}])` → `decodeMsgPack` | Full type round-trip |
| `encodeMsgPack({ nested: { deep: [1, { x: 2 }] } })` | Deep round-trip |
| `BufferReader.readInt32()` on 0 bytes | Throw or guard |
| `BufferWriter.writeString("x".repeat(10000))` | Large string survives |
| `BufferReader` then `BufferWriter` round-trip | All values match |
| `encodeBase58("")` | "" |
| `encodeBase58("hello")` → `decodeBase58` → "hello" | Round-trip |
| `encodeBase58(null)` | Throw |
| `encodeBase62("")` | "" |
| `encodeBase62("hello")` → `decodeBase62` → "hello" | Round-trip |
| `encodeBase62("x".repeat(10000))` → `decodeBase62` | Large round-trip |
| base58 invalid chars → `decodeBase58("0OIl")` | Throw |
| base62 invalid chars → `decodeBase62("!@#")` | Throw |
| MsgPack binary → Buffer round-trip | Survives |

### 22. `feature-flags` — Flag Store

```bash
npm test -- tests/feature-flags.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| `createFlagStore({})` → `get("nonexistent")` | false |
| `createFlagStore({ test: true }).get("test")` | true |
| `createFlagStore({ test: false }).get("test")` | false |
| `createFlagStore({ test: 0 }).get("test")` | false (falsy) |
| `createFlagStore({ test: 1 }).get("test")` | true? only if boolean |
| `createFlagStore({}).set("test", true).get("test")` | true |
| `createFlagStore({}).set("", true).get("")` | empty key allowed? |
| `createFlagStore({}).set("test", null)` | null stored |
| `createFlagStore({}).set("test", undefined)` | undefined stored? |
| `bucketUser("user123", 100)` → value 0-99 | Consistent for same user |
| `bucketUser("user123", 100)` called twice | Same bucket |
| `bucketUser("", 100)` | 0-99 |
| `bucketUser("user123", 0)` | 0 |
| `bucketUser("user123", -1)` | Throw |
| `bucketUser("user123", Infinity)` | Throw or handle |
| `hashString("")` | Valid hash |
| `hashString("hello")` | Deterministic → same hash |
| Percentage flag: `createFlagStore({ rollout: 50 })` | ~50% true |
| User-target flag: `flag for user in list` | True for target users |
| `getAll()` returns snapshot | Not mutation-safe? |
| `getAll()` includes all flags | Count matches |

### 23. `dom` — Browser Utilities

```bash
npm test -- tests/dom.test.ts -- --brutal
```

| Attack | Expected |
|--------|----------|
| All functions in Node.js | Throw `not-available` error |
| `copyToClipboard("")` (non-browser) | Throw |
| `downloadFile("")` (non-browser) | Throw |
| `readFileAsText()` (non-browser) | Throw |
| `onClickOutside(null, fn)` | Throw |
| `lockScroll()` in non-browser | Throw |
| `trapFocus(null)` in non-browser | Throw |
| `getViewport()` in non-browser | Throw |
| `isTouchDevice()` in non-browser | Throw |
| `scrollToTop()` in non-browser | Throw |
| `onVisible(null, fn)` in non-browser | Throw |

---

## 🔗 CROSS-MODULE CORRUPTION TESTS

Test that modules don't interfere with each other or pollute global state.

```bash
npm run test:cross-module
```

```typescript
// 1. Import ALL modules → no circular exports
import * as speexkit from 'speexkit'
expect(Object.keys(speexkit).length).toBe(250+)  // All exports

// 2. Module isolation: modify one module's internals should not affect others
const s1 = new LRUCache(10)
s1.set("x", 1)
// Schema module should be unaffected
const schema = s.string().parse("hello")
expect(schema).toBe("hello")

// 3. Global state: no leaked globals
expect((globalThis as any).__speexkit).toBeUndefined()

// 4. No prototype pollution
const obj: Record<string, unknown> = {}
expect(obj.constructor.prototype.polluted).toBeUndefined()
```

---

## 🏗️ BUILD & TYPESCRIPT FORTRESS

```bash
# ==== TypeScript Nuclear Option ====
npx tsc --noEmit --strict
# Must produce ZERO errors. Anything else = release blocker.

# ==== Dual Build ====
npx tsup
# ESM output in dist/esm/, CJS output in dist/cjs/
# Verify both work:

# ESM test
node -e "import('speexkit').then(m => console.log('ESM OK:', Object.keys(m).length))"

# CJS test
node -e "const m = require('speexkit'); console.log('CJS OK:', Object.keys(m).length)"

# ==== Bundle Size Check ====
# No module should exceed 50KB minified
Get-ChildItem dist -Recurse -Filter "*.js" | Where-Object { $_.Length -gt 50000 }

# ==== Dependency Check ====
# Zero runtime dependencies — verify
rg "require\(" dist/ --no-filename | sort -u | grep -v "^require('speexkit" | head -20
# Should only contain: speexkit internal requires, nothing external

# ==== Export Completeness ====
# Every file in src/ that exports something must have a matching .test.ts
```

---

## ⚡ PERFORMANCE & MEMORY GAUNTLET

```bash
npm run test:performance
```

| Test | Target |
|------|--------|
| LRU: 10000 set/get/delete | < 100ms |
| Trie: 10000 words insert + search | < 200ms |
| Heap: 10000 push/pop | < 50ms |
| PriorityQueue: 10000 enqueue/dequeue | < 50ms |
| Graph: shortestPath on 1000-node graph | < 100ms |
| textDiff: 100KB text | < 500ms |
| objectDiff: 10KB JSON | < 100ms |
| haversineDistance: 1M calls | < 500ms |
| Retry: 100 calls | < 200ms |
| sanitizeHtml: 100KB HTML | < 200ms |
| **Memory:** No leak after 10000 repeated ops | Heap stable |
| **Max Call Stack:** No CVE-level depth issue | Fails gracefully |

---

## 🌀 CHAOS ENGINEERING

```bash
npm run test:chaos
```

### Chaos Test 1: Order-of-operations fuzzing

```typescript
// Call functions in random order 100x
const ops = [
  () => cache.set("x", 1),
  () => cache.get("x"),
  () => cache.delete("x"),
  () => cache.clear(),
  () => queue.add(job),
  () => queue.pause(),
  () => queue.resume(),
]
for (let i = 0; i < 1000; i++) {
  randomChoice(ops)()  // Should never crash
}
```

### Chaos Test 2: Concurrent access

```typescript
// Same cache from 10 parallel contexts
const cache = new LRUCache(100)
await Promise.all(Array.from({ length: 10 }, (_, i) =>
  Promise.all(Array.from({ length: 100 }, () =>
    cache.set(`key-${Math.random()}`, Math.random())
  ))
))
expect(cache.size).toBeLessThanOrEqual(100)
```

### Chaos Test 3: OOM resistance

```typescript
// Should not crash process
try {
  cache.set("x", "x".repeat(1e9))
} catch (e) {
  // Graceful OOM handling
}
```

---

## 🔐 SECURITY PENETRATION SUITE

```bash
npm run test:security
```

| Attack Vector | Module | Expected |
|--------------|--------|----------|
| Prototype pollution via config | config | Rejected |
| CSRF token brute force | security | Mathematically infeasible (min 128-bit) |
| Rate limiter bypass (IP rotate) | security | Window shared by key |
| JWT none algorithm | auth | Rejected |
| JWT alg confusion (RS256→HS256) | auth | Rejected (hardcoded HS256) |
| XSS via stored data | dom/security | Sanitized on output |
| Infinite redirect | http | Max redirects cap |
| Header injection via newlines | http | Sanitized |
| Regex ReDoS | validation | All patterns tested for catastrophic backtracking |

### ReDoS Check (all regex patterns)

```bash
# Test every regex in validation module for ReDoS
npm test -- --grep "ReDoS"
```

Must test:
```typescript
isEmail("a" + "@".repeat(10000) + "b")  // Should not hang
isURL("http://" + "x".repeat(10000))    // Should not hang
isJWT("a." + "b".repeat(50000) + ".c")  // Should not hang
```

---

## 🧬 MUTATION TESTING

```bash
npm run test:mutation
```

For every module, create a mutant by changing one line and verify at least one test fails.

| Mutant | Must Fail |
|--------|-----------|
| Remove null guard in `textDiff` | null test fails |
| Remove NaN check in `convert` | NaN test fails |
| Remove max listeners in EventEmitter | memory leak test |
| Bypass capacity check in LRU | capacity test fails |
| Remove CSRF token length check | entropy test fails |
| Remove retry limit in retryWithBackoff | infinite loop test |
| Remove BloomFilter false positive guard | FP rate test fails |
| Remove auth algorithm check | alg confusion test |
| Remove sanitizeHtml strip scripts | XSS test fails |

---

## 🔒 REGRESSION LOCKDOWN

```bash
npm run test:regression
```

Every fix gets a regression test before merging:

```typescript
// Regression format
it('[GITHUB-ISSUE-NUMBER]: <description>', () => {
  // Previously crashed / returned wrong value
  expect(() => func(badInput)).not.toThrow()
  expect(func(badInput)).toBe(expectedSafeValue)
})
```

### Critical Regressions to Prevent

```typescript
// 1. Never return undefined when documented to return string
expect(typeof fakeName()).toBe("string")

// 2. Never mutate input
const input = { a: 1 }
objectDiff(input, { a: 2 })
expect(input.a).toBe(1)

// 3. Never pollute global scope
const beforeKeys = Object.keys(globalThis)
new EventEmitter()
expect(Object.keys(globalThis).filter(k => !beforeKeys.includes(k))).toEqual([])

// 4. Never leak uncaught rejections
process.on("unhandledRejection", () => { process.exit(1) })

// 5. ESM + CJS interop: `import speexkit from 'speexkit'` works
```

---

## 👹 CI/CD BOSS FIGHT

```yaml
# .github/workflows/brutal.yml
name: Brutal Test Suite
on: [push, pull_request]
jobs:
  brutal:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npx tsc --noEmit --strict       # TypeScript fortress
      - run: npx tsup                          # Dual build
      - run: npm test -- --run --reporter=junit # All tests
      - run: npm run test:brutal               # Brutal suite
      - run: npm run test:security             # Security suite
      - run: npm run test:chaos                # Chaos engineering
      - run: npm run test:cross-module         # Cross-module integrity
      - run: node -e "import('speexkit').then(m => console.log('ESM:', Object.keys(m).length))"
      - run: node -e "const m = require('speexkit'); console.log('CJS:', Object.keys(m).length)"
      - name: Bundle Size
        run: |
          $maxSize = 50000
          Get-ChildItem dist -Recurse -Filter "*.js" | Where-Object { $_.Length -gt $maxSize } | ForEach-Object { Write-Error "$($_.Name) exceeds ${maxSize}KB"; exit 1 }
      - name: Dependency Check
        run: |
          $deps = Select-String -Path dist -Pattern "require\(" | ForEach-Object { $_ -replace '.*require\(["'"'"']([^"'"'"']+)["'"'"']\).*', '$1' } | Sort-Object -Unique
          $external = $deps | Where-Object { $_ -ne 'speexkit' -and $_ -ne 'fs' -and $_ -ne 'path' -and $_ -ne 'crypto' -and $_ -ne 'os' -and $_ -ne 'net' -and $_ -ne 'stream' }
          if ($external) { Write-Error "External deps found: $external"; exit 1 }
```

---

## 🚀 QUICK LAUNCH

```bash
# Run everything (takes ~5-10 min)
npm run test:brutal-all

# Run a single module's brutal tests
npm test -- tests/cache.test.ts -- --brutal

# Run typecheck + build only (fast)
npm run verify

# Run security-specific
npm run test:security

# Run cross-module
npm run test:cross-module
```

### package.json scripts to add

```json
{
  "scripts": {
    "test:brutal": "npm test -- --run --reporter=verbose",
    "test:security": "npm test -- --grep \"security|XSS|CSRF|ReDoS|injection|prototype\"",
    "test:chaos": "npm test -- tests/brutal.test.ts -- --chaos",
    "test:cross-module": "npm test -- tests/universal.test.ts",
    "test:performance": "npm test -- --grep \"performance|benchmark|10000|1M\"",
    "test:regression": "npm test -- --grep \"regression|GH-|fix:\"",
    "test:brutal-all": "npm run tsc --noEmit --strict && npm run tsup && npm test -- --run && npm run test:security && npm run test:chaos",
    "verify": "npx tsc --noEmit --strict && npx tsup"
  }
}
```

---

## 📊 COVERAGE COMMANDMENTS

```
🔥 BRANCH COVERAGE: 100%  ← non-negotiable
🔥 LINE COVERAGE:    100%  ← non-negotiable
🔥 FUNCTION COVERAGE: 100%  ← non-negotiable
🔥 All `if` branches  → must be hit
🔥 All `catch` blocks → must be hit  
🔥 All `throw` statements → must be hit
🔥 All edge guards (null/undefined/NaN) → must be hit
```

---

*Last updated: 2026-06-30*
*Version: 1.4.14*
