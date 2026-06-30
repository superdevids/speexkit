# Changelog

## v1.4.14 (2026-06-30)
- **Full PRD audit:** All 46 modules now fully implemented and tested
- **Cache module:** LRUCache, LFUCache, TTLCache — with capacity guards (fractional max floored, 0 capacity handled)
- **CLI module:** renderTable (null passthrough), colorize (invalid colors), Spinner (ESM-compatible mocking)
- **Config module:** loadConfig silently skips nonexistent files; watchConfig throws on empty path
- **DOM module:** Fixed async/sync throw mismatch for readFileAsText/readFileAsDataURL
- **Queue module:** scheduleEvery minimum interval clamp (Math.max(1, intervalMs)) prevents infinite loops
- **Resilience module:** CircuitBreaker HALF_OPEN transition verified via onStateChange callback
- **Security module:** Iterative sanitization loop catches nested bypasses (e.g., `<<script>script>`); null input guard
- **46 test files, 2,544 tests — all passing** (previously 35 failures fixed)
- **56 entry points** (ESM + CJS + DTS) — dual build format
- **TypeScript strict — 0 errors** (tsc --noEmit)
- Updated README with complete 46-module reference table
- Bundle size: ~28 KB gzip (full barrel)

## v1.4.13 (2026-06-30)
- Added LabelEncoder (scikit-learn style categorical encoder) — 14th ML export
- Added KNN Classifier (k-nearest neighbors, supports uniform/distance weighting)
- Added 5 sub-entry points: isEmail, isURL, isUUID, MultiError, createError
- Updated build to 33 entry points (tsup + package.json exports)
- Added ML test suite: 26 tests covering all 15 ML exports
- Total: 1,503 tests across 25 test files, 20 modules
- Biome format & lint fixes across all source files

## v1.4.10 (2026-06-29)
- Fixed: camelCase(null) crash — added null guard in splitWords
- Fixed: isEmail(null) crash — added typeof guard
- Fixed: isCreditCard double-escaped regex (was matching backslash, not digits)
- Fixed: isPort double-escaped regex
- Fixed: isEmpty(null) returning false — missing null check in collection module
- All brutal test phases passed (10 phases, 0 failures)

## v1.4.9 (2026-06-29)
- Added barrel exports for ml, stats, viz-data modules
- Formatted minified source files to multi-line
- Fixed dep-exray known-mappings to reference speexkit

## v1.4.7 (2026-06-29)
- ML module: StandardScaler, LinearRegression, KMeans, trainTestSplit, metrics
- Stats module: gammaLn, erf, normalPDF, ttestInd, skewness, kurtosis
- Viz-data module: histogram, kde, boxPlotData, ecdf, colorMap
- 1,477 tests across 24 test files

## v0.8.x (2026-06-28)
- Initial release as speexkit (rebranded from speexjs-core)
- NDArray, functional tools, validation, async, collection, color, crypto, etc.
- Zero dependencies
