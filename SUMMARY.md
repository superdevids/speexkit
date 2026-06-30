# speexkit — Module Reference

v1.4.14 | 500+ exports | 48 modules | 0 deps | 2,544+ tests

> 📋 **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Module architecture, NDArray internals, build & design
> 📋 **[PRD01.md](./docs/PRD01.md)** — Product roadmap & feature priorities (v1.4.x → v3.0)

## Core Modules

### core
deepClone, deepMerge, deepEqual, pipe, compose, debounce, throttle, memoize, retry, noop, identity, once

### math
add, sub, mul, div, round, floor, ceil, approxEqual, clamp, sum, average, median, mode, stddev, sampleStddev, percentile, correlation, formatCurrency, isEven, isOdd, gcd, lcm, factorial, isPrime, toRadians, toDegrees, lerp, percentageOf, mapRange, range, weightedAverage, geometricMean, combinations, permutations, DivisionByZeroError

### date
formatDate, parseDate, dateDiff, addDays, addMonths, addYears, addHours, addMinutes, addSeconds, subDays, subMonths, subYears, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, isWeekend, isLeapYear, isBefore, isAfter, isBetween, isBusinessDay, addBusinessDays, calculateAge, timeAgo, timeRemaining, formatDuration, toTimezone, formatInTimezone, isToday, isYesterday, isTomorrow, isPast, isFuture, isSameDay, isEqual, unix, fromUnix, daysInMonth, dayOfYear, weekOfYear, quarter, maxDate, minDate, nextMonday–nextSunday, lastMonday–lastSunday, parseDuration, **humanizeDuration**, **getHolidays**, InvalidDateError

### string
capitalize, camelCase, kebabCase, snakeCase, pascalCase, upperFirst, lowerFirst, startCase, lowerCase, upperCase, truncate, template, uuid, nanoid, escapeHtml, unescapeHtml, trim, trimStart, trimEnd, pad, padStart, padEnd, reverse, words, slugify, countOccurrences, levenshtein, fuzzyMatch, maskString, formatBytes, randomString, randomBoolean, pluralize, stripHtml, truncateWords, isPalindrome, isAnagram, similarity, dedent, wordCount, swapCase, toCobolCase, charCount, escapeRegExp, lines, chars, **wrap**, **highlightMatches**, **diacriticsRemove**, **toTitleCase**

### async
sleep, timeout, raceWithTimeout, allSettledMap, parallelMap, retryAsync, pipeline, deferred, Queue, Semaphore, memoizeAsync, RateLimiter, Mutex, batch, waterfall, mapSeries, eachSeries, detect, debounceAsync

### validation
isPhone, isEmail, isURL, isIP, isIPv4, isIPv6, isUUID, isAlpha, isAlphanumeric, isNumeric, isInt, isFloat, isLength, isJSON, isStrongPassword, isBase64, matches, isCreditCard, isHexadecimal, isSlug, isPort, **isCronExpression**, **isIBAN**, **isISBN**, **isJWT**, **isLatLng**, **isMACAddress**, **isSemVer** (28 validators)

### collection
groupBy, keyBy, omit, pick, pluck, shuffle, sample, sampleSize, chunk, sortBy, orderBy, uniqueBy, flatten, uniq, first, last, isEmpty, topoSort, slidingWindows, tumblingWindows, deepGet, deepSet, partition, compact, difference, intersection, union, zip, unzip, countBy, maxBy, minBy, sumBy, findIndex, findLast, findLastIndex, drop, dropRight, take, takeRight, without, nth, pickBy, omitBy, mapKeys, mapValues, invert, invertBy, toPairs, fromPairs, hasPath, unset, mergeWith, defaults, defaultsDeep, deepFreeze, at, renameKeys, diff, fromKeys, findKey, forOwn, times, flattenDeep, flatMap, **paginate**, **rotate**, **transpose**

### crypto
hash, simpleHash, randomHex, base64Encode, base64Decode, generateToken, generateOTP, xorCipher, checksum, constantTimeEqual, **sha256**, **sha512**

### path
join, resolve, basename, dirname, extname, normalize, isAbsolute, relative, parse, format

### color
hexToRgb, rgbToHex, hexToHsl, hslToHex, lighten, darken, mix, contrastRatio, meetsWCAG, isValidHex, randomColor, isLight, isDark, complementary, alpha, rgbToHsl, hslToRgb, saturate, desaturate, adjustHue, rgba

### error
createError, isTypedError, TypedError, MultiError, collectErrors, **Result\<T,E\> (Ok/Err)**

### logger
Logger, logger, consoleTransport, createConsoleTransport, createJsonTransport, createFileTransport, createBufferedTransport

### io
parseCsv, stringifyCsv, safeJsonParse, safeJsonStringify, env, envInt, envBool, envArray, **readJSONFile**, **writeJSONFile**, **watchFile**

### type
isString, isNumber, isBoolean, isObject, isArray, isFunction, isDate, isRegExp, isMap, isSet, isPromise, isNull, isUndefined, isNil, isEmpty, assertDefined, assertType, ensureArray, castArray, isPlainObject, isError, isSymbol, isWeakMap, isWeakSet, isTypedArray, isDataView, isArguments, getType (28 guards)

## Specialist Modules

### nlarray
NDArray class: zeros, ones, full, eye, identity, arange, linspace, logspace, random, randn, from, reshape, flatten, ravel, transpose, slice, squeeze, repeat, add, sub, mul, div, pow, mod, abs, neg, clip, round, floor, ceil, sum, mean, var, std, min, max, argmin, argmax, cumsum, cumprod, all, any, nonzero, dot, matmul, norm, diagonal, trace, pad, where, map, apply, copy, equals, toArray, toList, toString, get, set, fill. Ufuncs: sin, cos, tan, exp, log, log2, log10, sqrt, abs, round, floor, ceil, clip, concatenate, stack, hstack, vstack

### nlfunction
curry, curryRight, partial, partialRight, tap, trace, memoizeSync, memoizeLast, negate, before, after, id, constant, over, apply, comparing, wrapArray, flow, tryCatch, attempt, property, converge, flip, ifElse, when, unless, debounce, throttle, once

### ml
StandardScaler, MinMaxScaler, LinearRegression, LogisticRegression, KMeans, PCA, DecisionTreeClassifier, DBSCAN, KNN, LabelEncoder, OneHotEncoder, trainTestSplit, kFold, crossValScore, confusionMatrix, accuracyScore, r2Score, meanSquaredError, meanAbsoluteError, euclideanDistance, manhattanDistance, cosineSimilarity

### stats
gammaLn, erf, normalPDF, normalCDF, binomialPMF, poissonPMF, skewness, kurtosis, quantile, iqr, covariance, anovaOneWay, chiSquareTest, chiSquareGoodnessOfFit, mannWhitneyU, ttestInd, pearsonCorrelation, spearmanCorrelation

### viz-data
sturgesBins, freedmanDiaconisBins, histogram, kde, boxPlotData, ecdf, colorMap, svgBarChart, svgLineChart, svgScatterChart, svgPieChart

### dep-exray
scanProject, generateReport, analyzeUsage, KNOWN_MAPPINGS, KNOWN_CVES. CLI: npx dep-exray .

## Platform Modules

### config
loadConfig, maskSecrets, watchConfig, fileSource, envSource, cliSource

### cache
LRUCache, LFUCache, TTLCache

### cli
renderTable, Spinner, confirm, prompt, colorize

### queue
scheduleEvery, Debouncer, Cron

### resilience
CircuitBreaker, Bulkhead, retryWithBackoff, Fallback, Timeout

### security
sanitizeHtml, hashPassword, verifyPassword, generateSalt, scanSecrets

### dom
copyToClipboard, downloadFile, readFileAsText, readFileAsDataURL, onClickOutside, lockScroll, trapFocus, getViewport, isTouchDevice, scrollToTop, scrollToElement, debounceResize, onVisible

### events
EventEmitter with typed events, on/off/emit/once/removeAllListeners

### intl
formatCurrency, formatNumber, formatList, formatRelativeTime, resolveLocale

### observability
meter, counter, histogram, trace, span, baggage, MetricsRegistry

### state-machine
StateMachine with typed states/transitions, guards, entry actions

### realtime
WebSocketClient with reconnect/backoff, SSE client

### feature-flags
FeatureFlagStore, percentage rollout, user bucketing, toggles

### reporter
buildReporter, checkReport

### schema
validate, parse, assertSchema, string/number/boolean/array/object/union/nullable

### mock
mockFn, mockModule, spy, stub, Clock, fakeName, fakeEmail, fakeLorem, fakeFromSchema

### units
convert, findUnit, formatUnit, isConvertible, getUnitCategory

### geo
haversine, geohashEncode, geohashDecode, geohashNeighbors, isPointInPolygon, boundingBox, toDMS, midpoint

### diff
textDiff, objectDiff, applyPatch, merge, unifiedDiff

### storage
localStorage, sessionStorage, memoryStorage wrappers, createStorage

### expansion
env expansion, nested expansion, template expansion

### coverage-boost
Coverage heuristics and utilities

### analyzer
Code analysis utilities

### scanner
File/directory scanner

### known-mappings
Well-known type/format mappings

### auth
signJWT, verifyJWT, decodeJWT, generatePKCE, verifyChallenge, parseBasicAuth

### http
createHttpClient, middleware, interceptors, RateLimitMiddleware

### serialize
encodeMsgPack, decodeMsgPack, encodeBase58, decodeBase58, encodeBase62, decodeBase62

### reactive
signal, computed, effect, batch — framework-agnostic reactivity system

### template
render, compile — mustache-compatible template engine (variables, sections, inverted sections, partials, comments, dotted paths)

### structures
Trie (prefix tree), Graph (adjacency list, BFS, DFS, Dijkstra, topoSort), Heap (min/max binary heap), PriorityQueue, LinkedList (doubly-linked), Deque (ring-buffer), BloomFilter (probabilistic membership), DisjointSet (Union-Find), Maybe&lt;T&gt; (Just/Nothing monad), Either&lt;L,R&gt; (Left/Right monad)

### viz-data (extended)
SVG chart generators: svgBarChart, svgLineChart, svgScatterChart, svgPieChart — zero-dependency inline SVG output

### stats (extended)
anovaOneWay (one-way ANOVA), chiSquareTest (contingency table independence), chiSquareGoodnessOfFit, mannWhitneyU (Wilcoxon rank-sum)

*Last updated: 2026-06-30*
