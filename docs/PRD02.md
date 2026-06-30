# PRD — SpeexKit: Modul & Fitur Baru (Brainstorm v2)

> **Versi Dokumen:** 1.0
> **Status:** Draft / Brainstorm
> **Tanggal:** 2026-06-30
> **Pelengkap dari:** PRD01.md (roadmap ML/Stats/NDArray/DataFrame yang sudah ada)
>
> Dokumen ini fokus ke **kategori fitur yang BELUM ada** di PRD01 — bukan ngulang KNN/PCA/DataFrame dll yang udah direncanain. Tujuannya: cari "gap" yang bikin dev JS/TS beneran ganti 3-5 package sekaligus jadi cuma `npm i speexkit`.

---

## 1. Kenapa Perlu Modul Baru?

PRD01 udah kuat di sisi **data/math/ML** (NDArray, ML, Stats). Tapi kalau lihat kebutuhan dev JS/TS sehari-hari di luar data science, masih ada lubang besar:

- Dev backend butuh: cache, rate limiter, circuit breaker, job queue, JWT
- Dev frontend butuh: state machine, event bus, storage wrapper, intl formatting
- Dev fullstack butuh: mock/fake data generator, schema builder (zod-lite), diff/patch
- Dev CLI/tools butuh: cron parser, table renderer, progress bar, arg parser
- Semua dev butuh: struktur data (LRU, Trie, Graph), text diff, slug/ID generator yang lebih lengkap

Semua ini sejalan dengan value prop SpeexKit: **zero-dependency, tree-shakeable, type-safe**.

---

## 2. Modul Baru yang Diusulkan

### 2.1 `speexkit/cache` — Caching Primitives
Pengganti `lru-cache`, `quick-lru`.

| Export | Deskripsi |
|---|---|
| `LRUCache` | Least-recently-used cache, max size/TTL |
| `LFUCache` | Least-frequently-used cache |
| `TTLCache` | Cache murni berbasis expiry |
| `memoizeWithCache(fn, cache)` | Bungkus fungsi pakai cache custom |
| `CacheStats` | hit/miss/evict counter |

```ts
const cache = new LRUCache<string, User>({ max: 500, ttl: 60_000 });
cache.set('u1', user);
cache.get('u1'); // User | undefined
```

**Priority:** P1 — sangat umum dipakai, effort kecil-medium.

---

### 2.2 `speexkit/resilience` — Reliability Patterns
Pengganti `cockatiel`, `opossum`, `p-retry`.

| Export | Deskripsi |
|---|---|
| `CircuitBreaker` | open/half-open/closed state machine untuk call eksternal |
| `Bulkhead` | batasi concurrent calls |
| `retryWithBackoff(fn, opts)` | exponential backoff + jitter (beda dari `retryAsync` yg udah ada — ini lebih advanced dgn policy) |
| `Fallback(fn, fallbackFn)` | graceful degradation |
| `Timeout(fn, ms)` | wrapper timeout reusable |

```ts
const breaker = new CircuitBreaker({ failureThreshold: 5, resetMs: 30_000 });
const safeCall = breaker.wrap(() => fetchExternalAPI());
```

**Priority:** P1 — krusial buat backend/microservice devs, dan belum ada satupun zero-dep package yang bagus untuk ini.

---

### 2.3 `speexkit/queue` — In-Process Job Queue & Scheduling
Beda dari `async.Queue` (concurrency control) — ini soal **job lifecycle**.

| Export | Deskripsi |
|---|---|
| `JobQueue` | enqueue/dequeue, priority, retry-on-fail, concurrency |
| `cron(expr)` | parse cron expression → next run time(s) |
| `scheduleEvery(interval, fn)` | wrapper setInterval yang aware drift |
| `Debouncer` (queue-aware) | batch jobs dalam window waktu |

```ts
const q = new JobQueue({ concurrency: 3, retries: 2 });
q.add(() => sendEmail(user));
cron('*/5 * * * *').next(); // Date berikutnya
```

**Priority:** P2.

---

### 2.4 `speexkit/structures` — Data Structures
Pengganti `js-sdsl`, `denque`, `bloom-filters`.

| Export | Deskripsi |
|---|---|
| `Trie` | prefix tree — autocomplete, dictionary |
| `Graph` | adjacency list, `bfs`, `dfs`, `dijkstra`, `topoSort` (versi graph, beda dari `collection.topoSort` array) |
| `BloomFilter` | probabilistic membership test |
| `Heap` / `PriorityQueue` | min/max heap |
| `LinkedList`, `Deque` | classic structures |
| `DisjointSet` (Union-Find) | buat clustering/graph problems |

```ts
const trie = new Trie();
trie.insert('react'); trie.insert('redux');
trie.startsWith('re'); // ['react', 'redux']

const g = new Graph();
g.addEdge('A', 'B', 1);
g.dijkstra('A'); // { B: 1, ... }
```

**Priority:** P2 — value tinggi buat interview-prep & algorithmic use case, juga dipakai internal modul lain (mis. dep-exray graph analysis).

---

### 2.5 `speexkit/schema` — Lightweight Schema Validation
Ini **beda** dari "Zod-compatible schema inference" di PRD01 (yang itu infer dari validators yang udah ada). Ini full schema builder ringan, alternatif `zod`/`yup` buat yang gak mau nambah 14kb dependency.

| Export | Deskripsi |
|---|---|
| `s.object({...})`, `s.string()`, `s.number()`, `s.array()`, `s.enum()` | builder chainable |
| `.optional()`, `.nullable()`, `.min()`, `.max()`, `.refine()` | modifier |
| `schema.parse(data)` / `schema.safeParse(data)` | validasi + type narrowing |
| `Infer<typeof schema>` | TS utility type buat extract type |

```ts
const UserSchema = s.object({
  name: s.string().min(2),
  age: s.number().min(0).optional(),
});
type User = Infer<typeof UserSchema>;
const result = UserSchema.safeParse(input);
```

**Priority:** P1 — ini fitur yang paling sering bikin orang nambah dependency (zod ~14kb). Kalau speexkit punya versi ringan zero-dep, ini killer feature.

**Risiko:** Effort besar (XL), perlu desain TS generic yang solid biar type inference akurat.

---

### 2.6 `speexkit/mock` — Fake Data Generator
Pengganti `@faker-js/faker` (yang ~2-5MB) dengan versi ringan.

| Export | Deskripsi |
|---|---|
| `fakeName()`, `fakeEmail()`, `fakeUUID()` (reuse `uuid` dari string), `fakeAddress()`, `fakePhone()`, `fakeCompany()`, `fakeSentence()`, `fakeParagraph()` | generator dasar |
| `fakeFromSchema(schema)` | generate data otomatis dari `speexkit/schema` |
| `seedRandom(seed)` | deterministic output buat testing |

```ts
seedRandom(42);
fakeFromSchema(UserSchema); // { name: 'Alex Putra', age: 27 }
```

**Priority:** P2 — sangat berguna buat testing & seeding database, sinergis sama modul schema.

---

### 2.7 `speexkit/diff` — Text & Object Diffing
Pengganti `fast-diff`, `diff`, `deep-diff`.

| Export | Deskripsi |
|---|---|
| `textDiff(a, b)` | Myers diff algorithm, output insert/delete/equal chunks |
| `unifiedDiff(a, b)` | format ala `git diff` |
| `objectDiff(a, b)` | reuse + extend `collection.diff` yang udah ada jadi nested deep diff dengan path |
| `patch(obj, diffResult)` | apply diff balik |

```ts
unifiedDiff(oldCode, newCode); // string ala git diff
```

**Priority:** P2 — berguna buat changelog generator, CMS versioning, audit log.

---

### 2.8 `speexkit/state-machine` — Finite State Machine
Pengganti `xstate` (yang berat, ~30kb+) versi minimal.

| Export | Deskripsi |
|---|---|
| `createMachine(config)` | states, transitions, guards, actions |
| `machine.send(event)` | trigger transition |
| `machine.matches(state)` | cek current state |
| `machine.subscribe(fn)` | observer pattern |

```ts
const trafficLight = createMachine({
  initial: 'red',
  states: {
    red: { on: { TICK: 'green' } },
    green: { on: { TICK: 'yellow' } },
    yellow: { on: { TICK: 'red' } },
  },
});
trafficLight.send('TICK');
```

**Priority:** P2 — berguna buat UI flow kompleks (checkout, wizard form, game state) tanpa nambah xstate yang berat.

---

### 2.9 `speexkit/events` — Typed Event Emitter & Pub/Sub
| Export | Deskripsi |
|---|---|
| `EventEmitter<EventMap>` | typed, generic-based, no `any` |
| `createPubSub<T>()` | simple pub/sub channel |
| `EventBus` | global/scoped bus dengan wildcard listener |

```ts
type Events = { login: { userId: string }; logout: void };
const bus = new EventEmitter<Events>();
bus.on('login', ({ userId }) => console.log(userId)); // fully typed
```

**Priority:** P1 — simple tapi sering banget dibutuhin, effort kecil, value tinggi.

---

### 2.10 `speexkit/storage` — Universal Storage Wrapper
Abstraksi di atas `localStorage`/`sessionStorage`/in-memory (buat SSR/Node) dengan API konsisten + TTL + namespacing.

| Export | Deskripsi |
|---|---|
| `createStorage({ driver, namespace, ttl })` | factory |
| `.get/.set/.remove/.clear/.keys()` | API standar |
| Driver: `memoryDriver`, `localStorageDriver`, `sessionStorageDriver`, `cookieDriver` | pluggable, auto-detect environment |

```ts
const store = createStorage({ driver: 'auto', namespace: 'app' });
store.set('token', jwt, { ttl: 3600_000 });
```

**Priority:** P2 — berguna banget buat frontend devs, dan auto-fallback ke memory di SSR/Node bikin ini lebih unggul dari raw `localStorage`.

---

### 2.11 `speexkit/intl` — Internationalization Helpers
Wrapper tipis di atas `Intl` API (native, jadi tetep zero-dep) + pluralization & simple translation.

| Export | Deskripsi |
|---|---|
| `formatNumber(n, locale, opts)`, `formatCurrency`, `formatRelativeTime`, `formatList` | wrapper `Intl.*` dengan defaults sensible |
| `pluralize(count, { one, other }, locale)` | rule-based pluralization (pakai `Intl.PluralRules`) |
| `createTranslator(messages, locale)` | i18n sederhana, key-based dengan interpolasi `{name}` |

```ts
const t = createTranslator({ en: { hello: 'Hello, {name}!' }, id: { hello: 'Halo, {name}!' } }, 'id');
t('hello', { name: 'Aditya' }); // "Halo, Aditya!"
```

**Priority:** P2 — tim Aditya kerja buat market Indonesia (Kata Netizen dll), modul ini relevan banget buat produk lokal yang butuh i18n ringan.

---

### 2.12 `speexkit/auth` — Token & Auth Helpers (browser+node safe)
| Export | Deskripsi |
|---|---|
| `signJWT(payload, secret, opts)`, `verifyJWT(token, secret)` | HMAC-based JWT, pure TS (pakai Web Crypto/node:crypto, no jsonwebtoken dep) |
| `decodeJWT(token)` | decode tanpa verify (buat baca payload di client) |
| `generatePKCE()` | code_verifier/code_challenge buat OAuth PKCE flow |
| `parseBasicAuth(header)` | helper buat backend |

```ts
const token = await signJWT({ sub: 'u1' }, secret, { expiresIn: '1h' });
const payload = await verifyJWT(token, secret);
```

**Priority:** P1 — auth itu kebutuhan hampir semua backend project (relevan ke HRIS, BrainClash, EVote Aditya). Hindari nambah `jsonwebtoken` cuma buat sign/verify simpel.

**Catatan keamanan:** HARUS clear dokumentasinya bahwa ini bukan pengganti library auth full-feature (OAuth server dll), cuma primitive.

---

### 2.13 `speexkit/cli` — CLI Building Blocks
Pengganti sebagian `commander`, `cli-table3`, `ora`, `chalk` (minus warna, atau warna minimal via ANSI native).

| Export | Deskripsi |
|---|---|
| `parseArgs(argv, spec)` | parser flag/positional args, mirip `util.parseArgs` tapi lebih ergonomis |
| `Table.render(rows, cols)` | ASCII table (sudah direncanain di PRD01 v2.0, tapi taro di sini biar grouping CLI module jelas) |
| `Spinner` | progress spinner berbasis stdout, tanpa dependency |
| `colorize(text, color)` | ANSI color helper ringan |
| `confirm(question)`, `prompt(question)` | simple stdin interaction |

**Priority:** P2 — sinergis banget sama `dep-exray` CLI yang udah ada, dan workflow Aditya yang banyak bikin CLI tools (autoloop.ps1, CEO Orchestrator).

---

### 2.14 `speexkit/geo` — Geospatial Utilities
| Export | Deskripsi |
|---|---|
| `haversineDistance(a, b)` | jarak antar koordinat (km/mi) |
| `isPointInPolygon(point, polygon)` | point-in-polygon test |
| `boundingBox(points)` | hitung bounding box |
| `geohash(lat, lng, precision)` / `decodeGeohash` | encode/decode geohash |
| `toDMS(decimal)` | convert decimal degree ke degree-minute-second |

**Priority:** P3 — niche tapi zero kompetitor zero-dep di area ini.

---

### 2.15 `speexkit/units` — Unit Conversion
| Export | Deskripsi |
|---|---|
| `convert(value, from, to)` | panjang, berat, suhu, volume, kecepatan, data size (KB↔MB↔GB dst, beda dari `formatBytes` yang cuma format) |
| `UNIT_CATEGORIES` | daftar kategori & unit yang didukung |

```ts
convert(100, 'km', 'mi'); // 62.14
convert(5, 'GB', 'MB'); // 5120
```

**Priority:** P3 — kecil effortnya, lumayan sering dibutuhin (apps kalkulator, e-commerce shipping, dsb).

---

## 3. Penambahan/Penguatan Modul yang SUDAH Ada (bukan modul baru, tapi extension)

| Modul Existing | Fitur Tambahan yang Diusulkan |
|---|---|
| `validation` | `isCronExpression`, `isJWT`, `isSemVer`, `isMACAddress`, `isLatLng`, `isISBN`, `isIBAN` |
| `string` | `wrap(text, width)` (word-wrap buat CLI output), `highlightMatches(text, query)`, `toTitleCase` yang aware stop-words ("the", "of"), `diacriticsRemove` |
| `collection` | `paginate(array, page, size)`, `rotate(array, n)`, `transpose(matrix)` buat array of arrays non-NDArray |
| `date` | `humanizeDuration` yang lebih natural-language ("2 hari 3 jam lalu" — relevan buat lokal ID), `getHolidays(country, year)` (statis dataset hari libur, opsional plugin) |
| `crypto` | `sha256`, `sha512` native wrapper eksplisit (saat ini cuma `hash()` generic — bikin lebih discoverable) |
| `error` | `Result<T, E>` type (Ok/Err) buat error handling tanpa throw — sinergis sama usulan Monad di PRD01 v1.7 |
| `io` | `readJSONFile`, `writeJSONFile` (Node fs wrapper dengan safe parse), `watchFile` |

---

## 4. Prioritized Roadmap Tambahan

| Modul Baru | Priority | Effort | Alasan Prioritas |
|---|---|---|---|
| `events` (typed EventEmitter) | **P1** | S | Effort kecil, dipakai di hampir semua app |
| `cache` (LRU/TTL) | **P1** | S-M | Sangat umum, gampang diuji |
| `resilience` (circuit breaker, retry) | **P1** | M | Gap nyata di ekosistem zero-dep |
| `schema` (zod-lite) | **P1** | XL | Killer feature, tapi effort & risk paling tinggi (type inference) |
| `auth` (JWT/PKCE) | **P1** | M | Dipakai luas, termasuk project Aditya sendiri (HRIS, EVote) |
| `storage` (universal wrapper) | P2 | S-M | Frontend value tinggi |
| `state-machine` | P2 | M | UI flow kompleks |
| `structures` (Trie/Graph/Heap) | P2 | M | Algorithmic + internal reuse |
| `mock` (fake data) | P2 | M | Sinergis dengan `schema` |
| `diff` (text/object) | P2 | M | Changelog/audit tooling |
| `queue` (job queue + cron) | P2 | M | Backend automation, relevan ke autoloop/orchestrator Aditya |
| `intl` | P2 | M | Relevan produk lokal ID |
| `cli` | P2 | M | Sinergis dep-exray & workflow CLI Aditya |
| `geo` | P3 | S | Niche, effort kecil |
| `units` | P3 | S | Niche, effort kecil |

**Saran urutan rilis:**
- **v1.6.0 (tambahan ke rencana existing):** `events`, `cache` — quick win, effort kecil, langsung nambah value besar
- **v1.7.0:** `resilience`, `auth`
- **v1.8.0 (baru, sisipkan sebelum v2.0):** `schema` (paling kompleks, butuh waktu sendiri) + `mock` yang sinergis
- **v1.9.0:** `state-machine`, `storage`, `structures`
- **v2.0.0:** gabung dengan rencana DataFrame — tambahkan `diff`, `queue`, `intl`, `cli`
- **Backlog (P3):** `geo`, `units` — isi waktu luang / kontribusi komunitas

---

## 5. Dampak ke Positioning

Dengan modul-modul ini, SpeexKit gak cuma "lodash + numpy + scikit-learn versi JS" tapi mulai masuk ke wilayah:

- **Pengganti zod/yup** → `schema`
- **Pengganti xstate (ringan)** → `state-machine`
- **Pengganti cockatiel/opossum** → `resilience`
- **Pengganti faker** → `mock`
- **Pengganti jsonwebtoken** → `auth`
- **Pengganti lru-cache** → `cache`

Narasi baru yang bisa dipakai: **"SpeexKit: satu package buat ganti 10+ dependency umum di project JS/TS — dari data science sampai backend resilience sampai schema validation, semua zero-dep & tree-shakeable."**

Risiko utama: scope creep. Perlu jaga prinsip arsitektur PRD01 (setiap modul independen, gak saling import) supaya tree-shaking tetap optimal walau modul nambah banyak.

---

## 6. Open Questions

1. Modul `schema` & `auth` makin deket ke "framework-ish" — apa perlu dipisah jadi package terpisah (`@speexor/schema`) biar core `speexkit` tetap ringan, atau tetap satu package dengan deep-import (`speexkit/schema`)?
2. `state-machine` dan `events` punya overlap konsep — perlu didesain biar `state-machine` bisa pakai `events` secara internal tanpa melanggar aturan "no cross-module import"? (Mungkin perlu exception khusus utility internal/private.)
3. Apakah `auth` (JWT signing) butuh audit security eksternal sebelum rilis stabil, mengingat ini bukan domain "utility" biasa?
4. `mock` + `schema` digabung sebagai satu paket use-case "testing toolkit" — apa perlu modul terpisah `speexkit/testing` yang juga isi snapshot helper & assertion ringan?