# Architecture — SpeexKit Utility Toolkit

> **Package:** speexkit · **Version:** 1.4.14 · **Zero Dependencies**
> **Last Updated:** 2026-06-30

---

## Table of Contents

1. [Overview](#1-overview)
2. [Module Architecture](#2-module-architecture)
3. [Source Layout](#3-source-layout)
4. [Module Reference](#4-module-reference)
5. [Design Principles](#5-design-principles)
6. [Build Configuration](#6-build-configuration)
7. [Module Independence](#7-module-independence)
8. [NDArray Internals](#8-ndarray-internals)
9. [ML Module Architecture](#9-ml-module-architecture)
10. [dep-exray CLI](#10-dep-exray-cli)
11. [Testing Strategy](#11-testing-strategy)
12. [Bundle Optimization](#12-bundle-optimization)
13. [Key Design Decisions](#13-key-design-decisions)

---

## 1. Overview

SpeexKit is a **zero-dependency TypeScript utility toolkit** providing 500+ functions across 46 modules. It aims to be a drop-in replacement for combinations of lodash, mathjs, date-fns, validator.js, basic NumPy/SciPy/scikit-learn functionality, plus config managers, cache stores, CLI tools, circuit breakers, HTML sanitizers, DOM helpers, event emitters, state machines, and more — all in a single, tree-shakeable, zero-dependency package.

The library is designed for maximum **tree-shakeability**: each module is fully independent, has its own entry point, and never imports from another speexkit module.

---

## 2. Module Architecture

```
                    speexkit (barrel)
                   src/index.ts (barrel)
                          │
          ┌───────────────┼──────────────────────────┐
          │               │                          │
     Core Modules    Specialist Modules         Platform Modules
          │               │                          │
          ▼               ▼                          ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ core         │ │ nlarray      │ │ config           │
│ math         │ │ nlfunction   │ │ cache            │
│ date         │ │ validation   │ │ cli              │
│ string       │ │ collection   │ │ queue            │
│ async        │ │ crypto       │ │ resilience       │
│ type         │ │ color        │ │ security         │
│ io           │ │ path         │ │ dom              │
│ error        │ │ logger       │ │ events           │
│              │ │ ml           │ │ intl             │
│              │ │ stats        │ │ observability    │
│              │ │ viz-data     │ │ state-machine    │
│              │ │ dep-exray    │ │ realtime         │
│              │ │ serialize    │ │ feature-flags    │
│              │ │ diff         │ │ reporter         │
│              │ │ geo          │ │ schema           │
│              │ │ units        │ │ mock             │
│              │ │ storage      │ │ auth             │
│              │ │ http         │ │ expansion        │
│              │ │              │ │ coverage-boost   │
│              │ │              │ │ analyzer         │
│              │ │              │ │ scanner          │
│              │ │              │ │ known-mappings   │
└──────────────┘ └──────────────┘ └──────────────────┘
```

**Key constraint:** Arrows represent zero cross-module imports — each module is a silo.

---

## 3. Source Layout

```
speexkit/
├── src/
│   ├── index.ts              # Barrel — re-exports all 46 modules (512+ lines)
│   │
│   ├── core/                 # 12 functions: deepClone, deepMerge, pipe, compose...
│   ├── math/                 # 35 functions: clamp, median, stddev, percentile...
│   ├── date/                 # 55+ functions: formatDate, timeAgo, addDays, humanizeDuration, getHolidays...
│   ├── string/               # 47+ functions: slugify, uuid, camelCase, wrap, highlightMatches...
│   ├── async/                # 19 functions: Queue, Semaphore, RateLimiter...
│   │   ├── index.ts
│   │   ├── queue.ts          #   FIFO async queue with concurrency control
│   │   ├── semaphore.ts      #   Counting semaphore for resource access
│   │   ├── ratelimit.ts      #   Sliding window rate limiter
│   │   ├── mutex.ts          #   Mutual exclusion lock
│   │   ├── batch.ts          #   Batch processing with size/time limits
│   │   └── waterfall.ts      #   Sequential async execution
│   │
│   ├── validation/           # 28 validators: isEmail, isIP, isUUID, isCronExpression...
│   │   ├── index.ts          #   Barrel
│   │   ├── isEmail.ts        #   RFC-compliant email validation
│   │   ├── isURL.ts          #   URL validator
│   │   ├── isIP.ts           #   IPv4/IPv6 validator
│   │   ├── isStrongPassword.ts # Password strength checker
│   │   └── ...               #   20+ individual validator files
│   │
│   ├── collection/           # 62+ functions: groupBy, sortBy, topoSort, paginate, rotate, transpose...
│   ├── type/                 # 28 type guards: isString, isNil, isPlainObject...
│   ├── crypto/               # 12 functions: randomHex, base64, generateToken, sha256, sha512...
│   ├── path/                 # 10 functions: join, resolve, basename...
│   ├── color/                # 21 functions: hexToRgb, lighten, contrastRatio...
│   ├── error/                # 6 exports: createError, TypedError, MultiError, Result<T,E>
│   ├── logger/               # Logger + transports (console, JSON, file, buffered)
│   ├── io/                   # 9 functions: parseCsv, safeJsonParse, env, readJSONFile, writeJSONFile, watchFile...
│   │
│   ├── nlarray/              # NDArray class + ufuncs (largest module: 2,011 lines)
│   │   └── index.ts          #   Full NumPy-style array implementation
│   │
│   ├── nlfunction/           # 26 functions: curry, pipe, ifElse, converge...
│   ├── ml/                   # ML algorithms: StandardScaler, LinearRegression, KMeans, KNN...
│   ├── stats/                # Statistical functions: ttestInd, normalPDF...
│   ├── viz-data/             # Data viz prep: histogram, kde, boxPlotData...
│   │
│   ├── config/               # loadConfig, maskSecrets, watchConfig
│   ├── cache/                # LRUCache, LFUCache, TTLCache
│   ├── cli/                  # renderTable, Spinner, confirm, prompt, colorize
│   ├── queue/                # scheduleEvery, Debouncer, Cron
│   ├── resilience/           # CircuitBreaker, Bulkhead, retryWithBackoff, Fallback, Timeout
│   ├── security/             # sanitizeHtml, hashPassword, scanSecrets
│   ├── dom/                  # copyToClipboard, scrollTo, trapFocus, onVisible...
│   ├── events/               # EventEmitter with typed events
│   ├── intl/                 # formatCurrency, formatNumber, formatList...
│   ├── observability/        # meter, counter, histogram, trace, span...
│   ├── state-machine/        # StateMachine with typed transitions
│   ├── realtime/             # WebSocketClient with reconnect/backoff
│   ├── feature-flags/        # FeatureFlagStore, percentage rollout
│   ├── reporter/             # buildReporter, checkReport
│   ├── schema/               # validate, parse, assertSchema
│   ├── mock/                 # mockFn, spy, stub, Clock
│   ├── units/                # convert, findUnit, formatUnit
│   ├── geo/                  # haversine, geohash, isPointInPolygon
│   ├── diff/                 # textDiff, objectDiff, applyPatch
│   ├── storage/              # localStorage/sessionStorage/memory wrappers
│   ├── auth/                 # JWT, PKCE, Basic Auth
│   ├── http/                 # HTTP client with interceptors
│   ├── serialize/            # MessagePack, base58/62
│   └── expansion/            # env/nested/template expansion
│   │
│   └── dep-exray/            # Dependency scanner (5 source files + CLI)
│       ├── index.ts          #   scanProject, generateReport, analyzeUsage
│       ├── scanner.ts        #   npm package.json scanner
│       ├── analyzer.ts       #   Dependency analysis engine
│       ├── reporter.ts       #   HTML/MD report generation
│       ├── known-mappings.ts #   Package replacement database
│       └── cli.ts            #   CLI entry point (npx dep-exray .)
│
├── tests/                    # 46 test files, 2,544 tests
│   ├── core.test.ts
│   ├── math.test.ts
│   ├── date.test.ts
│   ├── string.test.ts
│   ├── async.test.ts
│   ├── validation.test.ts
│   ├── collection.test.ts
│   ├── collection-object.test.ts
│   ├── type.test.ts
│   ├── crypto.test.ts
│   ├── path.test.ts
│   ├── color.test.ts
│   ├── error.test.ts
│   ├── logger.test.ts
│   ├── io.test.ts
│   ├── nlarray.test.ts
│   ├── nlfunction.test.ts
│   ├── ml.test.ts
│   ├── stats.test.ts
│   ├── viz-data.test.ts
│   ├── config.test.ts
│   ├── cache.test.ts
│   ├── cli.test.ts
│   ├── queue.test.ts
│   ├── resilience.test.ts
│   ├── security.test.ts
│   ├── dom.test.ts
│   ├── events.test.ts
│   ├── intl.test.ts
│   ├── observability.test.ts
│   ├── state-machine.test.ts
│   ├── realtime.test.ts
│   ├── feature-flags.test.ts
│   ├── reporter.test.ts
│   ├── schema.test.ts
│   ├── mock.test.ts
│   ├── units.test.ts
│   ├── geo.test.ts
│   ├── diff.test.ts
│   ├── storage.test.ts
│   ├── expansion.test.ts
│   ├── universal.test.ts
│   ├── coverage-boost.test.ts
│   ├── analyzer.test.ts
│   ├── scanner.test.ts
│   ├── known-mappings.test.ts
│   └── brutal.test.ts
│
├── dist/                     # Build output (gitignored)
├── tsup.config.ts            # Build configuration (56 entry points)
├── vitest.config.ts          # Test configuration
└── package.json              # Package manifest
```

---

## 4. Module Reference

### Core Modules

| Module | Size (LOC) | Functions | Description |
|--------|-----------|-----------|-------------|
| **core** | 497 | 12 | deepClone, deepMerge, deepEqual, pipe, compose, debounce, throttle, memoize, retry, noop, identity, once |
| **math** | ~250 | 35 | approxEqual, clamp, sum, average, median, mode, stddev, percentile, correlation, gcd, lcm, factorial, isPrime, combinations, permutations |
| **date** | 1,083 | 55+ | formatDate, parseDate, timeAgo, addBusinessDays, parseDuration, toTimezone, humanizeDuration, getHolidays |
| **string** | 560 | 47+ | slugify, uuid, nanoid, camelCase, snakeCase, kebabCase, levenshtein, fuzzyMatch, wrap, highlightMatches |
| **async** | ~400 | 19 | Queue, Semaphore, RateLimiter, Mutex, retryAsync, debounceAsync, batch, waterfall, parallelMap, memoizeAsync |
| **type** | ~200 | 28 | isString, isNil, isPlainObject, isTypedArray, isDataView, getType, castArray, assertDefined |
| **io** | ~150 | 9 | parseCsv, stringifyCsv, safeJsonParse, safeJsonStringify, readJSONFile, writeJSONFile, watchFile, env helpers |
| **error** | ~100 | 6 | createError, TypedError, MultiError, collectErrors, isTypedError, Result\<T,E\> |

### Specialist/ML Modules

| Module | Size (LOC) | Exports | Description |
|--------|-----------|---------|-------------|
| **nlarray** | 2,011 | 1 class + 6 ufuncs | NDArray — NumPy-style: broadcasting, slicing, matmul, axis reductions, 50+ methods |
| **nlfunction** | ~200 | 26 | curry, curryRight, partial, pipe, flow, ifElse, when, unless, converge, memoizeSync, tryCatch |
| **collection** | 1,075 | 62+ | groupBy, sortBy, topoSort, deepGet/Set, partition, flatten, pickBy, mapValues, deepFreeze, diff, paginate, rotate, transpose |
| **validation** | ~400 | 28 | isEmail, isIP, isUUID, isCreditCard, isStrongPassword, isCronExpression, isIBAN, isISBN, isJWT, isLatLng, isMACAddress, isSemVer |
| **crypto** | ~150 | 12 | hash, randomHex, base64, generateToken, generateOTP, xorCipher, checksum, constantTimeEqual, sha256, sha512 |
| **path** | ~150 | 10 | join, resolve, basename, dirname, extname, normalize, isAbsolute, relative, parse, format |
| **color** | 281 | 21 | hexToRgb, hexToHsl, lighten/darken, contrastRatio, meetsWCAG, mix, complementary, saturate/desaturate |
| **logger** | ~200 | 6 | Logger class + transports (console, JSON, file, buffered) |
| **ml** | 200+ | 15 | StandardScaler, MinMaxScaler, LinearRegression, KMeans, LabelEncoder, KNN, trainTestSplit, metrics, distances |
| **stats** | 123 | 13 | gammaLn, erf, normalPDF/CDF, binomialPMF, poissonPMF, skewness, kurtosis, ttestInd, pearson/spearman |
| **viz-data** | 79 | 7 | histogram, kde, boxPlotData, ecdf, colorMap, sturgesBins, freedmanDiaconisBins |
| **dep-exray** | ~300 | 5 + CLI | scanProject, generateReport, analyzeUsage, KNOWN_MAPPINGS, KNOWN_CVES |

### Platform Modules

| Module | Size (LOC) | Exports | Description |
|--------|-----------|---------|-------------|
| **config** | ~200 | 6 | loadConfig, maskSecrets, watchConfig, fileSource, envSource, cliSource |
| **cache** | ~150 | 3 | LRUCache, LFUCache, TTLCache |
| **cli** | ~200 | 5 | renderTable, Spinner, confirm, prompt, colorize |
| **queue** | ~200 | 3 | scheduleEvery, Debouncer, Cron |
| **resilience** | ~200 | 5 | CircuitBreaker, Bulkhead, retryWithBackoff, Fallback, Timeout |
| **security** | ~250 | 5 | sanitizeHtml, hashPassword, verifyPassword, generateSalt, scanSecrets |
| **dom** | ~200 | 13 | copyToClipboard, downloadFile, readFileAsText, readFileAsDataURL, onClickOutside, trapFocus, onVisible |
| **events** | ~100 | 1 | EventEmitter with typed events (on/off/emit/once) |
| **intl** | ~150 | 5 | formatCurrency, formatNumber, formatList, formatRelativeTime, resolveLocale |
| **observability** | ~300 | 10+ | meter, counter, histogram, trace, span, baggage, MetricsRegistry |
| **state-machine** | ~100 | 1 | StateMachine with typed states/transitions/guards |
| **realtime** | ~200 | 2 | WebSocketClient with reconnect+backoff, SSE client |
| **feature-flags** | ~100 | 3 | FeatureFlagStore, percentage rollout, user bucketing |
| **reporter** | ~50 | 2 | buildReporter, checkReport |
| **schema** | ~200 | 1 | validate/parse/assertSchema (Zod-lite) |
| **mock** | ~300 | 10+ | mockFn, mockModule, spy, stub, Clock, fakeName, fakeEmail, fakeFromSchema |
| **units** | ~150 | 5 | convert, findUnit, formatUnit, isConvertible, getUnitCategory |
| **geo** | ~200 | 7 | haversine, geohashEncode/Decode/Neighbors, isPointInPolygon, boundingBox, toDMS, midpoint |
| **diff** | ~200 | 5 | textDiff, objectDiff, applyPatch, merge, unifiedDiff |
| **storage** | ~150 | 1 | localStorage/sessionStorage/memoryStorage wrappers |
| **auth** | ~200 | 6 | signJWT, verifyJWT, decodeJWT, generatePKCE, verifyChallenge, parseBasicAuth |
| **http** | ~300 | 3 | createHttpClient, middleware, interceptors |
| **serialize** | ~300 | 6 | encodeMsgPack, decodeMsgPack, encodeBase58/62, decodeBase58/62 |
| **expansion** | ~100 | 3 | env expansion, nested expansion, template expansion |

---

## 5. Design Principles

| Principle | Description | Enforcement |
|-----------|-------------|-------------|
| **Zero dependencies** | No runtime deps. Pure TypeScript + Node.js built-ins. | CI check, manual review |
| **Module independence** | No module imports from another speexkit module. | ESLint rule, code review |
| **Deep imports** | `import { slugify } from 'speexkit/string'` — import only what you need. | package.json exports field |
| **TypeScript strict** | `strict: true`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` | `tsc --noEmit` |
| **ESM-only** | `"type": "module"` in package.json | Build config |
| **sideEffects: false** | Max tree-shakeability for bundlers (webpack, Rollup, esbuild) | package.json |
| **Prefer pure functions** | Standalone exported functions over classes, no mutation of inputs | Code review |
| **Predictable errors** | Typed errors via `TypedError` and `MultiError`; no silent failures | Code review |
| **JSDoc required** | `@param`, `@returns`, `@example` for all public exports | Lint check |

---

## 6. Build Configuration

| Setting | Value |
|---------|-------|
| **Bundler** | tsup (esbuild-based) |
| **Format** | ESM + CJS (dual build) |
| **Entry points** | 56 (one per module + subpath exports) |
| **Code splitting** | Disabled (single bundle per entry point) |
| **Target** | ES2022 |
| **TypeScript** | Strict mode |
| **Source maps** | Yes |
| **DTS** | Generated with `resolve: true` |
| **Minification** | None |
| **Clean** | Clean output before build |
| **Bundle size** | ~400 KB total (~28 KB gzip) |

### Entry Points (56 total)

```
speexkit                        → dist/index.{js,cjs}
speexkit/core                   → dist/core/index.{js,cjs}
speexkit/math                   → dist/math/index.{js,cjs}
speexkit/date                   → dist/date/index.{js,cjs}
speexkit/string                 → dist/string/index.{js,cjs}
speexkit/async                  → dist/async/index.{js,cjs}
speexkit/validation             → dist/validation/index.{js,cjs}
speexkit/collection             → dist/collection/index.{js,cjs}
speexkit/type                   → dist/type/index.{js,cjs}
speexkit/crypto                 → dist/crypto/index.{js,cjs}
speexkit/path                   → dist/path/index.{js,cjs}
speexkit/color                  → dist/color/index.{js,cjs}
speexkit/error                  → dist/error/index.{js,cjs}
speexkit/logger                 → dist/logger/index.{js,cjs}
speexkit/logger/transports      → dist/logger/transports.{js,cjs}
speexkit/io                     → dist/io/index.{js,cjs}
speexkit/ml                     → dist/ml/index.{js,cjs}
speexkit/stats                  → dist/stats/index.{js,cjs}
speexkit/viz-data               → dist/viz-data/index.{js,cjs}
speexkit/nlarray                → dist/nlarray/index.{js,cjs}
speexkit/nlfunction             → dist/nlfunction/index.{js,cjs}
speexkit/config                 → dist/config/index.{js,cjs}
speexkit/cache                  → dist/cache/index.{js,cjs}
speexkit/cli                    → dist/cli/index.{js,cjs}
speexkit/queue                  → dist/queue/index.{js,cjs}
speexkit/resilience             → dist/resilience/index.{js,cjs}
speexkit/security               → dist/security/index.{js,cjs}
speexkit/dom                    → dist/dom/index.{js,cjs}
speexkit/events                 → dist/events/index.{js,cjs}
speexkit/intl                   → dist/intl/index.{js,cjs}
speexkit/observability          → dist/observability/index.{js,cjs}
speexkit/state-machine          → dist/state-machine/index.{js,cjs}
speexkit/realtime               → dist/realtime/index.{js,cjs}
speexkit/feature-flags          → dist/feature-flags/index.{js,cjs}
speexkit/reporter               → dist/reporter/index.{js,cjs}
speexkit/schema                 → dist/schema/index.{js,cjs}
speexkit/mock                   → dist/mock/index.{js,cjs}
speexkit/units                  → dist/units/index.{js,cjs}
speexkit/geo                    → dist/geo/index.{js,cjs}
speexkit/diff                   → dist/diff/index.{js,cjs}
speexkit/storage                → dist/storage/index.{js,cjs}
speexkit/auth                   → dist/auth/index.{js,cjs}
speexkit/http                   → dist/http/index.{js,cjs}
speexkit/serialize              → dist/serialize/index.{js,cjs}
speexkit/expansion              → dist/expansion/index.{js,cjs}
speexkit/math/index             → dist/math/index.{js,cjs}
speexkit/dep-exray              → dist/dep-exray/index.{js,cjs}
speexkit/dep-exray/scanner      → dist/dep-exray/scanner/index.{js,cjs}
speexkit/dep-exray/analyzer     → dist/dep-exray/analyzer/index.{js,cjs}
speexkit/dep-exray/reporter     → dist/dep-exray/reporter/index.{js,cjs}
speexkit/dep-exray/types        → dist/dep-exray/types.{js,cjs}
speexkit/dep-exray/known-mappings → dist/dep-exray/known-mappings.{js,cjs}
speexkit/dep-exray/cli          → dist/dep-exray/cli.{js,cjs}
speexkit/validation/isEmail     → dist/validation/isEmail.{js,cjs}
speexkit/validation/isURL       → dist/validation/isURL.{js,cjs}
speexkit/validation/isUUID      → dist/validation/isUUID.{js,cjs}
speexkit/error/createError      → dist/error/createError.{js,cjs}
speexkit/error/MultiError       → dist/error/MultiError.{js,cjs}
```

---

## 7. Module Independence

Each module is a completely independent compilation unit:

```
┌─────────────────────────────────────────────────┐
│                 speexkit (barrel)                │
│               src/index.ts (re-exports)          │
├──────────┬──────────┬──────────┬─────────────────┤
│  Module  │  Module  │  Module  │   Independent   │
│  (ESM)   │  (ESM)   │  (ESM)   │  Build Entry    │
├──────────┼──────────┼──────────┼─────────────────┤
│ No cross │ No cross │ No cross │   No shared     │
│ imports  │ imports  │ imports  │   state         │
└──────────┴──────────┴──────────┴─────────────────┘
```

**Benefits:**
- Tree-shaking removes unused modules completely
- No risk of circular dependencies
- Individual modules can be imported without pulling in unrelated code
- Easy to test modules in isolation
- Easy to extract a module into its own package if needed

---

## 8. NDArray Internals

The **NDArray** (nlarray module) is the largest and most complex component at 2,011 lines.

### Data Model

```typescript
class NDArray {
  private data: Float64Array      // Flat buffer (row-major)
  private shape: number[]         // Dimensions: [3, 4] = 3×4 matrix
  private strides: number[]       // Byte strides: [4, 1]
  private offset: number          // Starting index for views/slices

  // Shape operations
  reshape(...dims): NDArray
  flatten(): NDArray
  transpose(): NDArray
  squeeze(): NDArray
  ravel(): NDArray

  // Math operations
  add(other): NDArray             // Broadcasting supported
  sub(other): NDArray
  mul(other): NDArray
  div(other): NDArray
  matmul(other): NDArray          // Matrix multiplication
  dot(other): NDArray             // Dot product

  // Reduction operations
  sum(axis?): NDArray
  mean(axis?): NDArray
  var(axis?): NDArray
  std(axis?): NDArray
  min(axis?): NDArray
  max(axis?): NDArray

  // Factory methods
  static zeros(shape): NDArray
  static ones(shape): NDArray
  static eye(size): NDArray
  static arange(start, stop?, step?): NDArray
  static linspace(start, stop, num): NDArray
  static random(shape): NDArray
  static randn(shape): NDArray

  // Ufuncs (universal functions)
  static sin(arr): NDArray
  static cos(arr): NDArray
  static exp(arr): NDArray
  static log(arr): NDArray
  static sqrt(arr): NDArray

  // Indexing
  get(...indices): number
  set(value, ...indices): void
  slice(...slices): NDArray      // View (no data copy)

  // Utilities
  copy(): NDArray
  equals(other): boolean
  toArray(): number[]
  toString(): string
}
```

### Broadcasting Rules

Follows NumPy broadcasting semantics:

1. If arrays have different number of dimensions, prepend 1s to the smaller shape
2. Arrays with size 1 along a dimension act as if they had the size of the array with the largest shape along that dimension
3. If a dimension size is neither 1 nor equal to the other array's dimension, throw error

### Memory Layout

- **Storage:** Single `Float64Array` (contiguous memory)
- **Order:** Row-major (C-style)
- **Views:** Slicing creates a view with adjusted offset/strides — no data copy
- **Copy:** Only on explicit `.copy()`, `.reshape()` (if shape changes contiguity), or `.transpose()` (returns copy)

---

## 9. ML Module Architecture

```typescript
// Base pattern for all estimators
interface Estimator {
  fit(X: number[][], y?: number[]): void
  predict(X: number[][]): number[]
}

// Implementations
class StandardScaler implements Estimator {
  // fit: compute mean + std per feature
  // transform: (x - mean) / std
  // fitTransform: fit + transform in one call
  // inverseTransform: (x * std) + mean
}

class MinMaxScaler {
  // fit: compute min + max per feature
  // transform: (x - min) / (max - min)
}

class LinearRegression {
  // fit: solve normal equations via Gaussian elimination
  // predict: X @ coefficients + intercept
  // coef_: learned coefficients
  // intercept_: learned intercept
}

class KMeans {
  // init: k-means++ initialization
  // fit: iterative Lloyd's algorithm
  // predict: assign to nearest centroid
  // inertia_: sum of squared distances
  // nIter_: number of iterations run
}
```

### Metrics

| Metric | Formula |
|--------|---------|
| `accuracyScore` | (TP + TN) / (TP + TN + FP + FN) |
| `r2Score` | 1 - (SS_res / SS_tot) |
| `meanSquaredError` | (1/n) Σ(yᵢ - ŷᵢ)² |
| `meanAbsoluteError` | (1/n) Σ|yᵢ - ŷᵢ| |
| `confusionMatrix` | [[TP, FP], [FN, TN]] |
| `euclideanDistance` | √Σ(xᵢ - yᵢ)² |
| `cosineSimilarity` | (x·y) / (||x|| · ||y||) |

---

## 10. dep-exray CLI

### Architecture

```
dep-exray (npx dep-exray .)
    │
    ▼
scanner.ts ──── reads package.json + node_modules
    │
    ▼
analyzer.ts ─── compares against KNOWN_MAPPINGS + KNOWN_CVES
    │
    ▼
reporter.ts ─── generates report (console table / JSON)
```

### Features

- **Bloat detection:** Finds npm packages that could be replaced by smaller alternatives or native Node.js APIs
- **CVE scanning:** Checks dependencies against known vulnerability database
- **Replacement suggestions:** Suggests speexkit alternatives for common npm packages
- **Bundle size estimation:** Reports approximate size impact of each dependency

### Known Mappings Database

```typescript
KNOWN_MAPPINGS = {
  'lodash':           { replacement: 'speexkit/collection', savings: '71 KB' },
  'date-fns':         { replacement: 'speexkit/date',       savings: 'varies' },
  'validator':        { replacement: 'speexkit/validation',  savings: '59 KB' },
  'chalk':            { replacement: 'native colors',       savings: '20 KB' },
  'uuid':             { replacement: 'speexkit/string',     savings: '8 KB' },
  'nanoid':           { replacement: 'speexkit/string',     savings: '5 KB' },
  // ... 30+ mappings
}
```

---

## 11. Testing Strategy

| Test Type | Framework | Coverage |
|-----------|-----------|----------|
| **Unit tests** | Vitest (46 files) | Per-module, individual function behavior |
| **Edge cases** | Vitest | null/undefined/NaN/Infinity handling |
| **Integration** | Vitest | Cross-module API surface smoke tests |
| **Brutal tests** | Vitest | Stress tests: 10 phases, 0 failures |
| **Coverage** | @vitest/coverage-v8 | Target >90% |

### Test Count: 2,544 across 46 test files

### Test Patterns

```typescript
describe('moduleName', () => {
  describe('functionName', () => {
    it('handles normal input', () => { /* ... */ })
    it('handles edge case (null/undefined/NaN)', () => { /* ... */ })
    it('handles boundary values', () => { /* ... */ })
    it('throws on invalid input', () => { /* ... */ })
  })
})
```

---

## 12. Bundle Optimization

### Strategy

| Technique | Implementation | Impact |
|-----------|---------------|--------|
| **Deep imports** | 56 separate entry points | Users only bundle what they import |
| **sideEffects: false** | package.json flag | Dead-code elimination by bundlers |
| **No code splitting** | Single file per entry | No chunk overhead for small modules |
| **No minification** | Consumer handles minification | Preserves source maps |
| **ESM + CJS dual build** | Both formats emitted | Compatibility with all bundlers and Node.js versions |
| **No classes in hot modules** | Prefer pure functions | Better DCE for unused exports |

### Size Budget

| Entry | Size (uncompressed) | Size (gzip) |
|-------|-------------------|-------------|
| Full barrel (`speexkit`) | ~400 KB | ~28 KB |
| Single module (`speexkit/string`) | ~17 KB | ~3 KB |
| NDArray (`speexkit/nlarray`) | ~49 KB | ~7 KB |

---

## 13. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Zero runtime dependencies** | Eliminates supply chain risk, fastest install, no dependency conflicts |
| **Single file per module** | Optimal balance between granularity and chunk overhead |
| **NDArray with Float64Array backend** | Native typed arrays for performance, single-precision compatible |
| **No cross-module imports** | Maximum tree-shakeability, no circular dep risk, testable in isolation |
| **ESM + CJS dual build** | ESM for modern bundlers, CJS for legacy Node.js — both emitted by tsup |
| **Prefer functions over classes** | Better tree-shaking (classes can't be fully DCE'd) |
| **TypedError pattern** | Consistent error handling with type narrowing via `isTypedError()` |
| **Validator files per function** | Individual validators in separate files for targeted imports |
| **dep-exray as built-in CLI** | Dogfooding: uses speexkit itself to scan dependencies |
| **JSDoc on all public exports** | IDE autocompletion without TypeScript declarations loaded |
| **No polyfills** | Targets ES2022+ only, assumes modern runtime |
