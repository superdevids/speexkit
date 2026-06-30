# SpeexKit

JavaScript/TypeScript utility toolkit — 500+ functions, 46 modules, zero dependencies.

```bash
npm install speexkit
```

## Features

- **NDArray** — NumPy-style arrays: broadcasting, slicing, matmul, axis reductions
- **ML** — StandardScaler, MinMaxScaler, LinearRegression, KMeans, LabelEncoder, KNN, trainTestSplit, metrics
- **Stats** — normalPDF, ttestInd, skewness, kurtosis, pearsonCorrelation
- **Viz** — histogram, kde, boxPlotData, ecdf, colorMap
- **Functional** — curry, pipe, ifElse, when, unless, converge, memoizeSync
- **Validation** — 28 validators: isEmail, isIP, isUUID, isCreditCard, isStrongPassword, isCronExpression, isIBAN, isISBN, isJWT, isLatLng, isMACAddress, isSemVer
- **Date** — formatDate, timeAgo, addBusinessDays, parseDuration, timezone, humanizeDuration, getHolidays
- **Async** — Queue, Semaphore, RateLimiter, Mutex, debounceAsync
- **Collection** — groupBy, topoSort, deepGet, pickBy, mapValues, diff, paginate, rotate, transpose
- **Math** — safe float, median, stddev, percentile, correlation, factorial
- **String** — slugify, uuid, nanoid, camelCase, levenshtein, fuzzyMatch, wrap, highlightMatches, diacriticsRemove, toTitleCase
- **28 type guards** — isString, isNil, isPlainObject, isTypedArray, getType
- **Config** — loadConfig, maskSecrets, watchConfig, file/env/cli sources
- **Cache** — LRUCache, LFUCache, TTLCache
- **CLI** — renderTable, Spinner, confirm, prompt, colorize
- **Queue** — scheduleEvery, Debouncer, Cron
- **Resilience** — CircuitBreaker, Bulkhead, retryWithBackoff, Fallback, Timeout
- **Security** — sanitizeHtml, hashPassword, scanSecrets
- **DOM** — copyToClipboard, scrollTo, trapFocus, onClickOutside, onVisible
- **Events** — EventEmitter with typed events
- **i18n** — formatCurrency, formatNumber, formatList, formatRelativeTime
- **Observability** — metrics, tracing, baggage
- **State Machine** — typed state machines with transitions
- **Realtime** — WebSocketClient with reconnect/backoff
- **Feature Flags** — percentage rollout, toggles
- **Schema** — validate, parse, assertSchema
- **Mock** — mockFn, spy, stub, Clock
- **Units** — unit conversion, formatting
- **Geo** — haversine, geohash encode/decode/neighbors
- **Diff** — deepDiff, applyPatch, merge
- **Storage** — localStorage/sessionStorage/memory wrappers
- **Error** — createError, TypedError, MultiError, Result&lt;T,E&gt; (Ok/Err)
- **Crypto** — generateToken, generateOTP, base64, randomHex, sha256, sha512
- **IO** — parseCsv, safeJsonParse, readJSONFile, writeJSONFile, watchFile

## Quick Examples

```typescript
import { NDArray } from 'speexkit/nlarray'
import { StandardScaler } from 'speexkit/ml'
import { normalPDF, ttestInd } from 'speexkit/stats'
import { curry, pipe } from 'speexkit/nlfunction'
import { formatDate, timeAgo } from 'speexkit/date'
import { isEmail, isStrongPassword } from 'speexkit/validation'

// NDArray — NumPy-style arrays
const arr = NDArray.arange(12).reshape([3, 4]);
arr.sum(1); // [6, 22, 38]

// ML — StandardScaler
const scaler = new StandardScaler();
scaler.fit([[1, 2], [3, 4], [5, 6]]);

// Stats — t-test
ttestInd([1, 2, 3], [4, 5, 6]);

// Functional
const add = curry((a, b) => a + b);
add(1)(2); // 3
pipe(x => x + 1, x => x * 2)(5); // 12

// Date and validation
formatDate(new Date(), 'YYYY-MM-DD');
isEmail('user@example.com');
isStrongPassword('P@ssw0rd!');
```

## Modules

| Subpath | Description |
|---------|-------------|
| speexkit/core | deepClone, deepMerge, pipe, memoize, debounce, throttle |
| speexkit/math | Safe float, median, stddev, percentile, correlation, factorial |
| speexkit/date | formatDate, timeAgo, addDays, business days, timezone, parseDuration, humanizeDuration, getHolidays |
| speexkit/string | slugify, uuid, nanoid, camelCase, levenshtein, fuzzyMatch, wrap, highlightMatches, diacriticsRemove, toTitleCase |
| speexkit/async | Queue, Semaphore, RateLimiter, Mutex, retryAsync, debounceAsync |
| speexkit/validation | 28 validators: isEmail, isIP, isUUID, isCreditCard, isStrongPassword, isCronExpression, isIBAN, isISBN, isJWT, isLatLng, isMACAddress, isSemVer |
| speexkit/collection | groupBy, topoSort, deepGet, pickBy, mapValues, diff, deepFreeze, paginate, rotate, transpose |
| speexkit/ml | StandardScaler, MinMaxScaler, LinearRegression, KMeans, LabelEncoder, KNN, metrics, distances |
| speexkit/stats | normalPDF, ttestInd, skewness, kurtosis, pearsonCorrelation |
| speexkit/viz-data | histogram, kde, boxPlotData, ecdf, colorMap |
| speexkit/nlarray | NDArray class with broadcasting, slicing, matmul, ufuncs |
| speexkit/nlfunction | curry, pipe, ifElse, when, unless, converge, memoizeSync |
| speexkit/crypto | generateToken, generateOTP, base64, randomHex, sha256, sha512 |
| speexkit/color | hexToRgb, hexToHsl, lighten, darken, contrastRatio, meetsWCAG |
| speexkit/error | createError, TypedError, MultiError, Result&lt;T,E&gt; (Ok/Err) |
| speexkit/logger | Structured logger with console/JSON/file transports |
| speexkit/io | parseCsv, safeJsonParse, safeJsonStringify, env helpers, readJSONFile, writeJSONFile, watchFile |
| speexkit/path | join, resolve, basename, dirname, extname (cross-platform) |
| speexkit/type | 28 type guards: isString, isNil, isPlainObject, getType |
| speexkit/config | loadConfig, maskSecrets, watchConfig, fileSource, envSource, cliSource |
| speexkit/cache | LRUCache, LFUCache, TTLCache |
| speexkit/cli | renderTable, Spinner, confirm, prompt, colorize |
| speexkit/queue | scheduleEvery, Debouncer, Cron |
| speexkit/resilience | CircuitBreaker, Bulkhead, retryWithBackoff, Fallback, Timeout |
| speexkit/security | sanitizeHtml, hashPassword, verifyPassword, generateSalt, scanSecrets |
| speexkit/dom | copyToClipboard, downloadFile, readFileAsText, readFileAsDataURL, onClickOutside, lockScroll, trapFocus, getViewport, isTouchDevice, scrollToTop, scrollToElement, debounceResize, onVisible |
| speexkit/events | EventEmitter, typed events |
| speexkit/intl | formatCurrency, formatNumber, formatList, formatRelativeTime, resolveLocale |
| speexkit/observability | meter, counter, histogram, trace, span, baggage |
| speexkit/state-machine | StateMachine, typed states/transitions |
| speexkit/realtime | WebSocketClient, reconnect, backoff |
| speexkit/feature-flags | FeatureFlagStore, percentage rollout, toggles |
| speexkit/reporter | buildReporter, checkReport |
| speexkit/schema | validate, parse, assertSchema |
| speexkit/mock | mockFn, mockModule, spy, stub, Clock |
| speexkit/units | convert, findUnit, formatUnit |
| speexkit/geo | haversine, geohashEncode, geohashDecode, geohashNeighbors |
| speexkit/diff | deepDiff, applyPatch, merge |
| speexkit/storage | localStorage, sessionStorage, memoryStorage wrappers |
| speexkit/expansion | env expansion, nested expansion, template expansion |
| speexkit/dep-exray | Dependency scanner + CLI (npx dep-exray .) |
| speexkit/coverage-boost | Coverage heuristics and utilities |
| speexkit/analyzer | Code analysis utilities |
| speexkit/scanner | File/directory scanner |
| speexkit/known-mappings | Well-known type/format mappings |

## Comparison

| Feature | speexkit | lodash | mathjs | date-fns |
|---------|----------|--------|--------|----------|
| Zero dependencies | YES | NO | NO | YES |
| NDArray (NumPy) | YES | NO | YES (heavy) | NO |
| ML (scikit-learn) | YES | NO | NO | NO |
| Stats (SciPy) | YES | NO | NO | NO |
| Async concurrency | YES | NO | NO | NO |
| 28 validators | YES | NO | NO | NO |
| Circuit breaker / Bulkhead | YES | NO | NO | NO |
| Config management | YES | NO | NO | NO |
| DOM helpers | YES | NO | NO | NO |
| CLI toolkit | YES | NO | NO | NO |
| Cache (LRU/LFU/TTL) | YES | NO | NO | NO |
| Bundle size (gzip) | ~28 KB | ~71 KB | ~200 KB | ~1 KB/fn |

## Quality

- 2,544 tests across 46 test files — all passing
- 0 runtime dependencies
- TypeScript strict — full .d.ts declarations
- Tree-shakeable — ESM with sideEffects: false
- Dual ESM + CJS packages
- MIT license

GitHub: https://github.com/superdevids/speexjs
