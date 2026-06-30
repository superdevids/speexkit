export type { Deferred, MemoizeAsyncOptions, QueueOptions } from './async/index.js'
export {
  allSettledMap,
  batch,
  debounceAsync,
  deferred,
  detect,
  eachSeries,
  Mutex,
  mapSeries,
  memoizeAsync,
  parallelMap,
  pipeline,
  Queue,
  RateLimiter,
  raceWithTimeout,
  retryAsync,
  Semaphore,
  sleep,
  timeout,
  waterfall,
} from './async/index.js'
export type { SortDirection } from './collection/index.js'
export {
  at,
  chunk,
  compact,
  countBy,
  deepFreeze,
  deepGet,
  deepSet,
  defaults,
  defaultsDeep,
  diff,
  difference,
  drop,
  dropRight,
  findIndex,
  findLast,
  first,
  flatten,
  fromKeys,
  fromPairs,
  groupBy,
  hasPath,
  intersection,
  invert,
  invertBy,
  isEmpty,
  keyBy,
  last,
  mapKeys,
  mapValues,
  maxBy,
  mergeWith,
  minBy,
  nth,
  omit,
  omitBy,
  orderBy,
  partition,
  pick,
  pickBy,
  pluck,
  renameKeys,
  sample,
  sampleSize,
  shuffle,
  slidingWindows,
  sortBy,
  sumBy,
  take,
  takeRight,
  toPairs,
  topoSort,
  tumblingWindows,
  union,
  uniq,
  uniqueBy,
  unset,
  unzip,
  without,
  zip,
  paginate,
  rotate,
  transpose,
} from './collection/index.js'
// ─── color (utilities) ──────────────────────────────────
export {
  adjustHue,
  alpha,
  complementary,
  contrastRatio,
  darken,
  desaturate,
  hexToHsl,
  hexToRgb,
  hslToHex,
  hslToRgb,
  isDark,
  isLight,
  isValidHex,
  lighten,
  meetsWCAG,
  mix,
  randomColor,
  rgba,
  rgbToHex,
  rgbToHsl,
  saturate,
} from './color/index.js'
export type {
  DebouncedFunction,
  DebounceOptions,
  MemoizedFunction,
  RetryOptions,
} from './core/index.js'
export {
  compose,
  debounce,
  deepClone,
  deepEqual,
  deepMerge,
  identity,
  memoize,
  noop,
  once,
  pipe,
  retry,
  throttle,
} from './core/index.js'
export {
  base64Decode,
  base64Encode,
  checksum,
  constantTimeEqual,
  generateOTP,
  generateToken,
  hash,
  randomHex,
  sha256,
  sha512,
  simpleHash,
  xorCipher,
} from './crypto/index.js'
export type { DateDiff, Duration } from './date/index.js'
export {
  addBusinessDays,
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addSeconds,
  addYears,
  calculateAge,
  dateDiff,
  dayOfYear,
  daysInMonth,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  formatDate,
  formatDuration,
  formatInTimezone,
  fromUnix,
  InvalidDateError,
  isAfter,
  isBefore,
  isBetween,
  isBusinessDay,
  isEqual,
  isFuture,
  isLeapYear,
  isPast,
  isSameDay,
  isToday,
  isTomorrow,
  isWeekend,
  isYesterday,
  lastFriday,
  lastMonday,
  lastSaturday,
  lastSunday,
  lastThursday,
  lastTuesday,
  lastWednesday,
  maxDate,
  minDate,
  nextFriday,
  nextMonday,
  nextSaturday,
  nextSunday,
  nextThursday,
  nextTuesday,
  nextWednesday,
  parseDate,
  parseDuration,
  quarter,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears,
  timeRemaining,
  toTimezone,
  unix,
  weekOfYear,
  humanizeDuration,
  getHolidays,
} from './date/index.js'
export type {
  DependencyInfo,
  ReplacementSuggestion,
  ScannerConfig,
  ScanResult,
  SecurityIssue,
} from './dep-exray/index.js'
// ─── dep-exray (dependency scanner) ───────────────────────────
export {
  analyzeUsage,
  generateReport,
  KNOWN_CVES,
  KNOWN_MAPPINGS,
  scanProject,
} from './dep-exray/index.js'
export type { ErrorCode, Result, OkImpl, ErrImpl } from './error/index.js'
// ─── error (typed errors + result type) ─────────────────
export {
  collectErrors,
  createError,
  err,
  Err,
  isTypedError,
  MultiError,
  ok,
  Ok,
  TypedError,
} from './error/index.js'

export type { CsvOptions } from './io/index.js'
export {
  env,
  envArray,
  envBool,
  envInt,
  parseCsv,
  safeJsonParse,
  safeJsonStringify,
  stringifyCsv,
  readJSONFile,
  writeJSONFile,
  watchFile,
} from './io/index.js'
export type {
  LogLevel,
  Transport,
} from './logger/index.js'
// ─── logger (structured logging) ────────────────────────
export {
  consoleTransport,
  Logger,
  logger,
} from './logger/index.js'
export {
  createBufferedTransport,
  createConsoleTransport,
  createFileTransport,
  createJsonTransport,
} from './logger/transports.js'
export {
  add,
  approxEqual,
  average,
  ceil,
  clamp,
  combinations,
  correlation,
  DivisionByZeroError,
  div,
  factorial,
  floor,
  gcd,
  geometricMean,
  inRange,
  isEven,
  isOdd,
  isPrime,
  lcm,
  lerp,
  mapRange,
  median,
  mode,
  mul,
  percentageOf,
  percentile,
  permutations,
  randomInt,
  range,
  round,
  sampleStddev,
  stddev,
  sub,
  sum,
  toDegrees,
  toRadians,
  weightedAverage,
} from './math/index.js'
// ─── ml (machine learning) ─────────────────────────────
export {
  accuracyScore,
  confusionMatrix,
  cosineSimilarity,
  euclideanDistance,
  KMeans,
  KNN,
  LabelEncoder,
  LinearRegression,
  MinMaxScaler,
  manhattanDistance,
  meanAbsoluteError,
  meanSquaredError,
  r2Score,
  StandardScaler,
  trainTestSplit,
} from './ml/index.js'
// ─── nlarray (NumPy-like NDArray) ──────────────────────
export { cos, exp, log, NDArray, sin, sqrt } from './nlarray/index.js'
// ─── nlfunction (functional programming) ────────────────
export {
  after,
  apply,
  attempt,
  before,
  comparing,
  constant,
  converge,
  curry,
  curryRight,
  flip,
  flow,
  id,
  ifElse,
  memoizeLast,
  memoizeSync,
  negate,
  over,
  partial,
  partialRight,
  property,
  tap,
  trace,
  tryCatch,
  unless,
  when,
  wrapArray,
} from './nlfunction/index.js'
export type { ParsedPath } from './path/index.js'
export {
  basename,
  dirname,
  extname,
  format,
  isAbsolute,
  join,
  normalize,
  parse,
  relative,
  resolve,
} from './path/index.js'
// ─── stats (statistics) ────────────────────────────────
export {
  binomialPMF,
  covariance,
  erf,
  gammaLn,
  iqr,
  kurtosis,
  normalCDF,
  normalPDF,
  pearsonCorrelation,
  poissonPMF,
  quantile,
  skewness,
  spearmanCorrelation,
  ttestInd,
} from './stats/index.js'
export {
  camelCase,
  capitalize,
  charCount,
  chars,
  countOccurrences,
  dedent,
  diacriticsRemove,
  escapeHtml,
  escapeRegExp,
  formatBytes,
  fuzzyMatch,
  highlightMatches,
  isAnagram,
  isPalindrome,
  kebabCase,
  levenshtein,
  lines,
  lowerCase,
  lowerFirst,
  maskString,
  nanoid,
  pad,
  padEnd,
  padStart,
  pascalCase,
  randomBoolean,
  randomString,
  reverse,
  similarity,
  slugify,
  snakeCase,
  startCase,
  stripHtml,
  swapCase,
  template,
  toCobolCase,
  toTitleCase,
  trim,
  trimEnd,
  trimStart,
  truncate,
  truncateWords,
  unescapeHtml,
  upperCase,
  upperFirst,
  uuid,
  wordCount,
  words,
  wrap,
} from './string/index.js'
export {
  assertDefined,
  assertType,
  castArray,
  ensureArray,
  getType,
  isArguments,
  isArray,
  isBoolean,
  isDataView,
  isDate,
  isError,
  isFunction,
  isMap,
  isNil,
  isNull,
  isNumber,
  isObject,
  isPlainObject,
  isPromise,
  isRegExp,
  isSet,
  isString,
  isSymbol,
  isTypedArray,
  isUndefined,
  isWeakMap,
  isWeakSet,
} from './type/index.js'
// ─── validation ────────────────────────────────────────
export {
  isAlpha,
  isAlphanumeric,
  isBase64,
  isCreditCard,
  isCronExpression,
  isEmail,
  isFloat,
  isHexadecimal,
  isIBAN,
  isInt,
  isIP,
  isIPv4,
  isIPv6,
  isISBN,
  isJSON,
  isJWT,
  isLatLng,
  isLength,
  isMACAddress,
  isNumeric,
  isPhone,
  isPort,
  isSemVer,
  isSlug,
  isStrongPassword,
  isURL,
  isUUID,
  matches,
} from './validation/index.js'
// ─── viz-data (visualization data) ─────────────────────
export {
  boxPlotData,
  colorMap,
  ecdf,
  freedmanDiaconisBins,
  histogram,
  kde,
  sturgesBins,
} from './viz-data/index.js'
// ─── events (typed EventEmitter) ──────────────────────────
export { EventBus, EventEmitter, createPubSub, type WildcardPayload } from './events/index.js'
// ─── cache (LRU/LFU/TTL) ──────────────────────────────────
export { CacheStatsCollector, LRUCache, LFUCache, TTLCache, memoizeWithCache, type CacheStats } from './cache/index.js'
// ─── resilience (circuit breaker, bulkhead, retry) ────────
export { Bulkhead, CircuitBreaker, Fallback, Timeout, retryWithBackoff, type CircuitBreakerOptions, type CircuitState, type RetryWithBackoffOptions } from './resilience/index.js'
// ─── auth (JWT/PKCE) ─────────────────────────────────────
export { decodeJWT, generatePKCE, parseBasicAuth, signJWT, verifyJWT } from './auth/index.js'
// ─── schema (zod-lite) ────────────────────────────────────
export { ValidationError, Schema, OptionalSchema, NullableSchema, StringSchema, NumberSchema, BooleanSchema, ArraySchema, ObjectSchema, EnumSchema, LiteralSchema, s, type Infer } from './schema/index.js'
// ─── storage (universal storage wrapper) ──────────────────
export { createStorage, Storage, memoryDriver, localStorageDriver, sessionStorageDriver, cookieDriver, type StorageDriver, type StorageOptions, type CookieDriverOptions } from './storage/index.js'
// ─── state-machine (FSM) ─────────────────────────────────
export { createMachine, type Machine, type MachineConfig, type MachineContext } from './state-machine/index.js'
// ─── structures (Trie, Graph, Heap, etc) ─────────────────
export { BloomFilter, Deque, DisjointSet, Graph, Heap, LinkedList, PriorityQueue, Trie } from './structures/index.js'
// ─── mock (fake data generator) ──────────────────────────
export { fakeAddress, fakeAvatar, fakeBoolean, fakeCity, fakeColor, fakeCompany, fakeDate, fakeDepartment, fakeEmail, fakeFirstName, fakeFloat, fakeFullName, fakeInt, fakeJobTitle, fakeLastName, fakeLorem, fakeName, fakeParagraph, fakePhone, fakeSentence, fakeStreet, fakeUrl, fakeUUID, fakeFromSchema, seedRandom } from './mock/index.js'
// ─── diff (text & object diff) ───────────────────────────
export { objectDiff, patch, textDiff, unifiedDiff, type DiffChunk, type ObjectDiffResult } from './diff/index.js'
// ─── queue (job queue & scheduling) ──────────────────────
export { Debouncer, JobQueue, cron, scheduleEvery } from './queue/index.js'
export type { Job, JobQueueOptions } from './queue/index.js'
// ─── intl (internationalization) ─────────────────────────
export { createTranslator, formatCurrency, formatList, formatNumber, formatRelativeTime, pluralize, timeAgo } from './intl/index.js'
// ─── cli (CLI building blocks) ───────────────────────────
export { Spinner, renderTable, colorize, confirm, parseArgs, prompt, type ArgOption, type ArgSpec, type ParsedArgs, type TableColumn, type TableOptions } from './cli/index.js'
// ─── geo (geospatial utilities) ──────────────────────────
export { boundingBox, decodeGeohash, geohash, haversineDistance, isPointInPolygon, midpoint, toDMS, type Coord } from './geo/index.js'
// ─── units (unit conversion) ─────────────────────────────
export { UNIT_CATEGORIES, convert, convertWithCategory, getUnitCategory, isConvertible } from './units/index.js'
// ─── http (HTTP client) ────────────────────────────────────
export { HttpError, createHttpClient, type HttpClient, type HttpClientOptions, type HttpResponse, type Interceptor, type RateLimitMiddlewareOptions } from './http/index.js'
// ─── security (sanitization & hardening) ───────────────────
export { createRateLimiter, csrfToken, detectSecrets, maskPII, sanitizeHtml, verifyCsrfToken, type SecretMatch } from './security/index.js'
// ─── config (layered configuration) ────────────────────────
export { cliSource, envSource, fileSource, loadConfig, maskSecrets, watchConfig } from './config/index.js'
export type { ConfigSource, LoadConfigOptions } from './config/index.js'
// ─── observability (metrics & tracing) ─────────────────────
export { Counter, Gauge, Histogram, MetricsRegistry, Tracer, getCorrelationId, setCorrelationId, toOTLPJson, withCorrelationId, type Span, type SpanTreeNode } from './observability/index.js'
// ─── realtime (WebSocket & SSE) ────────────────────────────
export { createSSEClient, createWSClient, type SSEClient, type SSEClientOptions, type WSClient, type WSClientOptions } from './realtime/index.js'
// ─── serialize (MessagePack, binary) ───────────────────────
export { BufferReader, BufferWriter, decodeBase58, decodeBase62, decodeMsgPack, encodeBase58, encodeBase62, encodeMsgPack } from './serialize/index.js'
// ─── feature-flags ─────────────────────────────────────────
export { bucketUser, createFlagStore, hashString, type FlagDefinition, type FlagStore, type FlagStoreOptions } from './feature-flags/index.js'
// ─── dom (browser utilities) ──────────────────────────────
export { copyToClipboard, debounceResize, downloadFile, getViewport, isTouchDevice, lockScroll, onClickOutside, onVisible, readFileAsDataURL, readFileAsText, scrollToElement, scrollToTop, trapFocus } from './dom/index.js'
