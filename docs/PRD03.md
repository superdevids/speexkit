# PRD v3 — SpeexKit: Analisis Gap Mendalam & Rencana Pengembangan Lanjutan

> **Versi Dokumen:** 1.0
> **Status:** Draft / Gap Analysis
> **Tanggal:** 2026-06-30
> **Basis Analisis:** PRD01.md (roadmap inti: NDArray/ML/Stats/DataFrame) + PRD02 (brainstorm modul: cache/resilience/schema/auth/dll)

---

## 1. Tujuan Dokumen

PRD01 udah solid di sisi **data science layer** (NDArray, ML, Stats, Viz). PRD02 udah nambal gap di sisi **application building blocks** (cache, resilience, schema, auth, event bus, dll).

Tapi setelah dua dokumen itu digabung dan dianalisis ulang, masih ada **gap struktural dan kategori fitur** yang belum disentuh sama sekali — baik dari sisi *fitur* maupun dari sisi *proses/arsitektur* package itu sendiri. Dokumen ini membedah gap tersebut secara sistematis, lalu menurunkannya jadi rencana konkret.

---

## 2. Metodologi Gap Analysis

Gap dicek dari 4 sudut:

1. **Gap Fungsional** — kategori use-case dev JS/TS yang belum ada modulnya sama sekali di PRD01+PRD02
2. **Gap Arsitektural** — masalah di level package (build, distribusi, kompatibilitas runtime) yang gak akan keselesaian cuma dengan nambah modul
3. **Gap Kualitas/Proses** — testing, benchmarking, dokumentasi, governance yang disebut sambil lalu di PRD01 tapi belum punya rencana konkret
4. **Gap Sinergi Internal** — modul-modul yang udah/akan ada tapi gak saling terhubung padahal seharusnya bisa nambah value besar kalau terhubung

---

## 3. Gap Fungsional — Kategori Fitur yang Belum Tersentuh

### 3.1 `speexkit/http` — HTTP Client & Middleware Layer
**Gap:** PRD02 punya `resilience` (circuit breaker, retry) sebagai primitive generik, tapi belum ada **HTTP client** yang menyatukannya jadi siap pakai. Dev masih harus pakai `axios`/`ky`/`got`.

| Export | Deskripsi |
|---|---|
| `createHttpClient(opts)` | wrapper di atas native `fetch`, dengan base URL, default headers |
| `.use(interceptor)` | request/response interceptor (mirip axios) |
| Built-in integrasi `resilience.retryWithBackoff` & `CircuitBreaker` sebagai opsi `client.withRetry()` / `client.withCircuitBreaker()` | |
| `RateLimitMiddleware` (token bucket, per-key) | buat rate-limit outgoing request atau di sisi server (Express/Hono middleware) |
| `parseResponse<T>(schema)` | integrasi langsung ke `speexkit/schema` buat validasi response API |

```ts
const api = createHttpClient({ baseURL: 'https://api.example.com' })
  .withRetry({ maxAttempts: 3 })
  .withCircuitBreaker({ failureThreshold: 5 });

const user = await api.get('/users/1').parseAs(UserSchema);
```

**Kenapa ini gap penting:** `resilience` tanpa `http` itu kayak punya mesin tanpa mobil. Sinergi ini yang bikin SpeexKit beda dari sekadar "kumpulan utility lepas-lepas" — ini contoh nyata *modul saling melengkapi* (lihat juga gap 3.7).

**Priority:** **P1** | Effort: M-L

---

### 3.2 `speexkit/realtime` — WebSocket & SSE Client Wrapper
**Gap:** Tidak ada satupun modul soal koneksi realtime, padahal Aditya sendiri kerja di BrainClash (Socket.IO based). Native WebSocket itu painful soal reconnect & heartbeat.

| Export | Deskripsi |
|---|---|
| `createWSClient(url, opts)` | auto-reconnect dengan backoff, heartbeat ping/pong, message queue saat disconnect |
| `createSSEClient(url)` | Server-Sent Events wrapper dengan auto-reconnect |
| `.on(event, handler)` | integrasi ke `speexkit/events` (typed EventEmitter dari PRD02) |

**Priority:** P2 | Effort: M

---

### 3.3 `speexkit/serialize` — Binary & Compact Serialization
**Gap:** Cuma ada `io.parseCsv`/JSON safe parse — belum ada serialisasi binary buat performa (WebSocket payload, IndexedDB, file storage).

| Export | Deskripsi |
|---|---|
| `encodeMsgPack(obj)` / `decodeMsgPack(buf)` | MessagePack-lite, lebih kecil dari JSON |
| `BufferReader` / `BufferWriter` | low-level binary read/write (varint, fixed-size int, string) |
| `encodeBase62`, `encodeBase58` | tambahan dari `base64Encode` yang udah ada — relevan buat short URL/ID generator |

**Priority:** P3 | Effort: M (algoritma MessagePack udah well-documented)

---

### 3.4 `speexkit/config` — Layered Configuration Management
**Gap:** `io.env/envInt/envBool` itu primitif banget (cuma baca satu env var). Real-world app butuh **layered config**: default → file (.env/json/yaml) → env var → CLI arg, dengan validasi skema.

| Export | Deskripsi |
|---|---|
| `loadConfig({ sources, schema })` | merge berurutan dari multiple sources, lalu validasi via `speexkit/schema` |
| `maskSecrets(config, keys)` | buat logging config tanpa expose secret |
| `watchConfig(path, onChange)` | reload config saat file berubah (Node) |

```ts
const config = loadConfig({
  sources: [defaults, fileSource('.env'), envSource(), cliSource(process.argv)],
  schema: ConfigSchema,
});
```

**Priority:** P2 | Effort: M — **sinergi langsung sama `schema` (PRD02) dan `io` (existing)**

---

### 3.5 `speexkit/observability` — Tracing, Metrics, Structured Logging Lanjutan
**Gap:** `logger` module yang ada itu cuma transport-based logging biasa. Belum ada **metrics** (counter/gauge/histogram) atau **tracing** (span/correlation ID) — krusial buat debugging sistem multi-agent kayak CEO Orchestrator milik Aditya sendiri.

| Export | Deskripsi |
|---|---|
| `Counter`, `Gauge`, `Histogram` | metrics primitives, in-memory, exportable ke format Prometheus text atau JSON |
| `createSpan(name)` / `Tracer` | tracing ringan dengan parent-child span, correlation ID propagation |
| `withCorrelationId(fn)` | context propagation (pakai `AsyncLocalStorage` di Node) |
| Export adapter: `toPrometheusFormat()`, `toOTLPJson()` (format kompatibel OpenTelemetry, tapi tanpa SDK berat) | |

**Priority:** P2 | Effort: L — **gap besar untuk use-case Aditya sendiri** (multi-agent orchestration butuh observability buat debug 67+ agent yang jalan paralel)

---

### 3.6 `speexkit/security` — Sanitization & Hardening Primitives
**Gap:** `validation` cuma cek format (isEmail dll), `crypto` cuma hash/token. Belum ada modul soal **sanitasi input** dan **proteksi attack umum**.

| Export | Deskripsi |
|---|---|
| `sanitizeHtml(input, opts)` | strip tag berbahaya (beda dari `escapeHtml` yang cuma escape semua — ini whitelist-based) |
| `csrfToken()` / `verifyCsrfToken()` | generate & verify CSRF token |
| `RateLimiter` per-IP/per-key (HTTP-aware) | beda dari `async.RateLimiter` yang generic — ini punya helper khusus utk Express/Hono/Fastify middleware |
| `detectSecrets(text)` | scan string/file buat pola API key/token yang ketinggalan (relevan ke `dep-exray` juga — lihat gap 3.10) |
| `maskPII(text)` | mask email/nomor HP/NIK dari log/text (relevan banget buat Kata Netizen yang olah data publik Indonesia) |

**Priority:** **P1** | Effort: M — gap keamanan itu sering jadi alasan dev pilih library mature, jadi ini penting buat positioning "enterprise-ready"

---

### 3.7 `speexkit/api-client-gen` — Type-safe API Client dari Schema
**Gap:** PRD02 udah punya `schema` (zod-lite). Tapi belum ada yang **memanfaatkan** schema itu buat generate client API otomatis (mirip `openapi-typescript` + `ts-rest`).

| Export | Deskripsi |
|---|---|
| `defineEndpoint({ method, path, input, output })` | definisikan endpoint dengan schema dari `speexkit/schema` |
| `createTypedClient(endpoints)` | hasilnya: client function yang fully-typed, terintegrasi `speexkit/http` |
| CLI: `npx speexkit gen-client openapi.json` | generate definisi endpoint dari OpenAPI spec (opsional, P3 kalau scope-nya kebesaran) |

**Priority:** P3 (bagus tapi besar) | Effort: XL — **ini contoh paling jelas soal "sinergi 3 modul jadi 1 value besar": `schema` + `http` + codegen**

---

### 3.8 `speexkit/feature-flags` — Feature Flag & Experimentation
**Gap:** Tidak ada di PRD01/02 sama sekali, padahal makin umum dipakai (gradual rollout, A/B test).

| Export | Deskripsi |
|---|---|
| `createFlagStore({ flags, overrides })` | evaluasi flag boolean/percentage rollout/user-targeting |
| `bucketUser(userId, experimentId, variants)` | deterministic hashing buat A/B bucket assignment |

**Priority:** P3 | Effort: S-M

---

### 3.9 `speexkit/dom` — Browser/DOM Utilities (opsional, kalau target frontend makin serius)
**Gap:** SpeexKit murni "headless" utility — gak ada yang sentuh DOM sama sekali. Kalau strategi tetap "backend+data-science first" ini boleh di-skip, tapi kalau mau lebih kuat juga di frontend:

| Export | Deskripsi |
|---|---|
| `copyToClipboard(text)`, `downloadFile(blob, name)`, `readFileAsText/DataURL` | wrapper Web API yang sering berulang ditulis manual |
| `onClickOutside(el, handler)`, `lockScroll()`, `trapFocus(el)` (a11y) | UI behavior primitives |
| `debounceResize(fn)`, `useIntersection`-style observer wrapper (non-React, plain function) | |

**Priority:** P3 — **opsional, perlu keputusan strategis dulu** (lihat Open Question di Bab 6)

---

### 3.10 Penguatan `dep-exray` — Security & Secrets Scanning
**Gap turunan dari 3.6:** `dep-exray` sekarang cuma scan dependency usage/replacement. Belum scan **secrets leak** atau **known CVE di transitive deps** secara dalam.

| Tambahan | Deskripsi |
|---|---|
| `dep-exray --scan-secrets` | pakai `security.detectSecrets` buat cari API key ketinggalan di kode |
| `dep-exray --audit-deep` | cross-check `KNOWN_CVES` juga ke transitive dependency, bukan cuma direct |

**Priority:** P2 | Effort: S (reuse modul lain)

---

## 4. Gap Arsitektural — Masalah Level Package

Ini bukan soal fitur baru, tapi soal **fondasi** yang kalau gak dibenahi bakal jadi utang teknis besar pas package makin gede.

### 4.1 ESM-Only = Gap Kompatibilitas
**Masalah:** PRD01 eksplisit bilang "ESM-only" sebagai *design decision*. Tapi ini gap nyata: banyak proyek legacy/enterprise (termasuk sebagian tooling Node lama) masih CJS. `"type": "module"`-only package akan **menolak** `require()`.

**Rekomendasi:**
- Tambah **dual build** (ESM + CJS) minimal untuk entry point utama via `tsup` (sudah mendukung dual output, tidak perlu dependency baru)
- Atau, kalau tetap mau ESM-only demi tree-shaking, dokumentasikan **eksplisit** di README dengan section "Compatibility" + sertakan workaround (`import()` dinamis untuk CJS)

**Priority:** **P0** — ini blocker adopsi enterprise, bukan cuma "nice to have"

---

### 4.2 Belum Ada Matrix Kompatibilitas Runtime (Deno, Bun, Edge Runtime)
**Masalah:** PRD01 cuma sebut "Node.js" implisit (lewat `crypto`, `fs` di modul `io`). Modul-modul baru di PRD02/PRD03 (`http`, `storage`, `auth` pakai Web Crypto) makin nambah ketergantungan ke environment tertentu, tapi **tidak ada dokumentasi resmi** mana yang jalan di mana.

**Rekomendasi:**
- Buat **Compatibility Matrix** resmi di README: kolom Module × (Node / Browser / Deno / Bun / Edge/Cloudflare Workers)
- CI test matrix jalan di minimal Node + browser (via `happy-dom`/`vitest browser mode`) — beberapa modul (`storage`, `dom`) WAJIB browser-tested
- Modul yang Node-only (`io.readJSONFile`, `crypto` pakai `node:crypto`) harus auto-fallback atau throw error jelas di environment lain, bukan silent fail

**Priority:** **P0** | Effort: M

---

### 4.3 Tidak Ada Benchmark Suite Formal
**Masalah:** PRD01 nyebut "Benchmark suite (vs lodash, mathjs, date-fns)" cuma sebagai 1 baris di v3.0 roadmap (P4!). Padahal **klaim performa** (NDArray, ML, cache) butuh bukti, dan ini harus dari awal bukan ditunda ke v3.

**Rekomendasi:**
- Naikkan priority benchmark suite ke **P1**, jalankan dari v1.5/v1.6, bukan nunggu v3.0
- Pakai `tinybench` atau bikin sendiri di `speexkit/dev-utils` (internal, gak di-publish)
- Publish hasil di README sebagai bagian dari positioning kompetitif (Bab 7 PRD01)

**Priority:** **P1** (naik dari P4 di PRD01)

---

### 4.4 Belum Ada Strategi Migrasi/Codemod untuk Breaking Changes
**Masalah:** PRD01 udah nyebut beberapa breaking change di v2.0 (`dep-exray` format, deprecate `simpleHash`). Tapi gak ada **tooling** buat bantu user migrasi — cuma "documented in CHANGELOG".

**Rekomendasi:**
- Sediakan `npx speexkit migrate` codemod sederhana (pakai `jscodeshift` sebagai **devDependency**, bukan runtime dep — tetap zero runtime-dep) buat auto-fix breaking changes simpel (rename function, dll)

**Priority:** P2 | Effort: M

---

### 4.5 Tidak Ada Dokumentasi Interaktif/Playground
**Masalah:** PRD01 nyebut "Website with playground" tapi taro di v3.0 (P4) — padahal dokumentasi yang baik itu salah satu faktor adopsi terbesar buat library zero-dep yang sifatnya "discoverability"-nya rendah (400+ fungsi tersebar di 20+ modul, susah ditemukan tanpa search yang bagus).

**Rekomendasi:**
- Minimal: site dokumentasi statis (Vitepress/Starlight) dari JSDoc yang udah ada, bisa di-generate otomatis — gak perlu nunggu sampai v3
- Search yang bagus (Algolia DocSearch gratis untuk OSS) jauh lebih penting daripada playground interaktif di tahap awal

**Priority:** P1 (untuk *docs site basic*, bukan full playground) | Effort: M

---

### 4.6 Bundle Size Governance Belum Konkret
**Masalah:** PRD01 sebut "Bundle size creep" sebagai risk #3 dengan mitigasi "size-limit CI gate (60 KB max)" — tapi cuma disebut, gak ada detail per-modul.

**Rekomendasi:**
- Tetapkan **size budget per modul** (bukan cuma total), misal: setiap modul baru max 5-8 KB gzip kecuali dijustifikasi (`nlarray` & `ml` boleh lebih besar karena kompleksitas algoritma)
- Tools: `size-limit` dengan config per entry point, jalan di CI tiap PR, fail kalau ada modul yang nambah > threshold tanpa approval

**Priority:** P1 | Effort: S

---

## 5. Gap Sinergi Internal — Modul yang Harusnya Terhubung

Ini insight paling penting dari analisis mendalam: **banyak gap di atas sebenarnya bisa diselesaikan dengan *menghubungkan* modul yang sudah/akan ada**, bukan bikin modul yang benar-benar baru.

| Kombinasi Modul | Sinergi yang Hilang Kalau Dipisah |
|---|---|
| `schema` (PRD02) + `mock` (PRD02) | Generate fake data otomatis dari schema — **sudah disebut di PRD02**, tapi perlu ditegaskan sebagai dependency arah, bukan dua modul lepas |
| `schema` + `http` (gap 3.1) | Validasi response API otomatis, generate client (gap 3.7) |
| `schema` + `config` (gap 3.4) | Validasi config layered |
| `resilience` (PRD02) + `http` (gap 3.1) | Retry/circuit-breaker yang siap pakai untuk network call, bukan cuma primitive generik |
| `events` (PRD02) + `state-machine` (PRD02) + `realtime` (gap 3.2) | State machine yang reaktif terhadap WebSocket event — relevan langsung ke BrainClash (real-time match state) |
| `security.detectSecrets` (gap 3.6) + `dep-exray` (existing) | Scanning lebih lengkap dalam satu CLI (gap 3.10) |
| `logger` (existing) + `observability` (gap 3.5) | Correlation ID otomatis ikut ke setiap log line |
| `crypto` (existing) + `auth` (PRD02) | JWT signing reuse `hash`/HMAC primitive yang udah ada, jangan reimplement |

**Rekomendasi arsitektur:** Pertimbangkan ulang prinsip "**setiap modul fully independent, no cross-import**" (PRD01 §6.2) — prinsip ini bagus buat tree-shaking modul *primitif* (math, string, date), tapi untuk modul *aplikasi* (http, schema, resilience, auth, observability) prinsip ini sebenarnya **menghalangi value tertinggi** dari kombinasi modul.

**Usulan:** Bagi modul jadi 2 tier:
- **Tier 1 — Primitives** (math, string, date, collection, type, dll): tetap strict no cross-import
- **Tier 2 — Composable** (http, schema, resilience, auth, observability, config, realtime): **boleh** saling import antar sesama Tier 2, tapi tidak boleh balik import dari Tier 1 ke Tier 2

Ini jadi keputusan arsitektur paling penting di PRD v3 ini.

**Priority:** **P0 (keputusan arsitektur)** — harus diputuskan SEBELUM modul Tier 2 mulai dikerjakan, karena migrasi arsitektur belakangan jauh lebih mahal.

---

## 6. Ringkasan Gap & Rekomendasi Prioritas

| # | Gap | Tipe | Priority | Effort |
|---|---|---|---|---|
| 1 | Prinsip arsitektur Tier 1/Tier 2 (cross-import policy) | Arsitektural | **P0** | — (keputusan) |
| 2 | ESM-only → dual ESM/CJS build | Arsitektural | **P0** | M |
| 3 | Runtime compatibility matrix (Node/Browser/Deno/Bun/Edge) | Arsitektural | **P0** | M |
| 4 | `speexkit/http` — HTTP client + middleware | Fungsional | **P1** | M-L |
| 5 | `speexkit/security` — sanitize, CSRF, secrets detection, PII mask | Fungsional | **P1** | M |
| 6 | Benchmark suite (naik dari P4 ke P1) | Kualitas | **P1** | M |
| 7 | Docs site basic (bukan playground penuh) | Kualitas | **P1** | M |
| 8 | Bundle size governance per-modul | Kualitas | P1 | S |
| 9 | `speexkit/config` — layered config + schema validation | Fungsional | P2 | M |
| 10 | `speexkit/observability` — metrics + tracing | Fungsional | P2 | L |
| 11 | `speexkit/realtime` — WebSocket/SSE client | Fungsional | P2 | M |
| 12 | `dep-exray` extension — secrets & deep CVE scan | Fungsional | P2 | S |
| 13 | Migration codemod tooling | Kualitas | P2 | M |
| 14 | `speexkit/serialize` — MessagePack-lite, binary buffer | Fungsional | P3 | M |
| 15 | `speexkit/api-client-gen` — schema-to-client codegen | Fungsional | P3 | XL |
| 16 | `speexkit/feature-flags` | Fungsional | P3 | S-M |
| 17 | `speexkit/dom` — browser utilities | Fungsional | P3 (perlu keputusan strategis) | M |

---

## 7. Roadmap Revisi (Mengintegrasikan PRD01 + PRD02 + Gap v3)

| Versi | Fokus Utama | Item Baru dari v3 |
|---|---|---|
| **v1.5.0** | ML Expansion (sudah ada di PRD01) | + Mulai benchmark suite (gap #6), bundle size governance (gap #8) |
| **v1.6.0** | Reactive & IO (PRD01) + `events`, `cache` (PRD02) | + **Keputusan arsitektur Tier 1/2** (gap #1) sebelum modul Tier 2 mulai ditulis |
| **v1.7.0** | Advanced Analytics (PRD01) + `resilience`, `auth` (PRD02) | + Dual ESM/CJS build (gap #2), mulai docs site (gap #7) |
| **v1.8.0** *(baru)* | `schema`, `mock` (PRD02) | + `speexkit/security` (gap #5) — schema & security sering dipakai bersamaan (validasi + sanitasi input) |
| **v1.9.0** *(baru)* | `state-machine`, `storage`, `structures` (PRD02) | + `speexkit/realtime` (gap #11), runtime compatibility matrix final (gap #3) |
| **v1.10.0** *(baru)* | `http` (gap #4), `config` (gap #9) | Modul Tier 2 pertama yang saling cross-import (http ⇄ resilience ⇄ schema) |
| **v2.0.0** | DataFrame, Schema-inference Zod-compat (PRD01) + `diff`, `queue`, `intl`, `cli` (PRD02) | + `observability` (gap #10), migration codemod (gap #13) |
| **v2.x** | — | `serialize`, `feature-flags`, `dep-exray` deep scan |
| **v3.0.0** | Performance & Ecosystem (PRD01: GPU/WASM) | `api-client-gen` (gap #15) kalau traction cukup besar; `dom` module kalau strategi frontend diputuskan iya |

---

## 8. Risiko Tambahan (Pelengkap Risk Register PRD01 §8)

| # | Risiko | Severity | Mitigasi |
|---|---|---|---|
| 11 | Modul Tier 2 (http/auth/observability) bikin SpeexKit terasa seperti "framework", menggeser positioning dari "utility library" | Medium | Dokumentasi jelas: Tier 2 itu opsional/deep-import, core value tetap di Tier 1 |
| 12 | `auth` (JWT) salah implementasi crypto primitive → vulnerability serius | **Critical** | Wajib code review keamanan eksternal sebelum stable release, gunakan Web Crypto/node:crypto API yang sudah teraudit, JANGAN reimplement algoritma kripto dari nol |
| 13 | Dual ESM/CJS build nambah kompleksitas build & ukuran publish | Low | `tsup` sudah handle ini secara native, overhead minimal |
| 14 | Modul `dom`/`realtime` butuh testing environment browser yang belum ada di CI saat ini | Medium | Investasi setup `vitest` browser mode / `playwright` sebelum modul ini mulai dikerjakan |
| 15 | Scope total package makin besar (Tier 1 + Tier 2 + ML/Stats) → maintenance burden naik tajam | High | Pertimbangkan **monorepo per-tier** (`@speexkit/core`, `@speexkit/data`, `@speexkit/app`) sambil tetap publish meta-package `speexkit` yang re-export semua, biar user existing gak breaking tapi maintainer bisa kerja lebih modular |

---

## 9. Open Questions (Pelengkap PRD01 §10C & PRD02 §6)

1. **Keputusan tier arsitektur** (Bab 5) — apakah disetujui? Ini gating decision buat semua modul Tier 2.
2. Apakah perlu pecah jadi **monorepo multi-package** (`@speexkit/core`, `@speexkit/data-science`, `@speexkit/app-toolkit`) mengingat scope udah sangat besar (Tier 1 + ML/Stats + Tier 2 app-layer)? Atau tetap 1 package besar dengan deep-import?
3. Strategi frontend (`dom` module, gap #17) — apakah SpeexKit mau benar-benar masuk ke wilayah frontend utility, atau tetap fokus backend+data+app-layer dan biarkan frontend DOM utilities jadi domain library lain?
4. Untuk `auth`/`security` — siapa yang akan melakukan security review sebelum rilis stable? Perlu proses formal (mis. minta audit komunitas/cryptography expert) sebelum diberi label "production-ready".
5. Apakah benchmark suite publish hasil real-time di README (auto-update via CI), atau snapshot manual per-rilis?