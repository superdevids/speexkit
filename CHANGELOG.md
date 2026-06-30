# Changelog

## v1.4.15 (2026-06-30)
- **PRD completion:** All 48 modules fully implemented and production-ready
- **ML Expansion:** Added PCA, LogisticRegression, DecisionTreeClassifier, DBSCAN, OneHotEncoder, kFold/crossValScore
- **Reactive Module:** signal(), computed(), effect(), batch() — framework-agnostic reactivity
- **Template Engine:** render(), compile() — mustache-compatible (variables, sections, partials, comments)
- **Structures:** Trie, Graph (BFS/DFS/Dijkstra), Heap, PriorityQueue, LinkedList, Deque, BloomFilter, DisjointSet
- **Monads:** Maybe&lt;T&gt; (Just/Nothing), Either&lt;L,R&gt; (Left/Right) with full functor/monad compliance
- **Stats Expansion:** anovaOneWay, chiSquareTest, chiSquareGoodnessOfFit, mannWhitneyU
- **SVG Charts:** svgBarChart, svgLineChart, svgScatterChart, svgPieChart — zero-dep inline SVG
- **NDArray Enhancement:** SVD (fixed Jacobi atan2 algorithm), polyfit, polyval, FFT/IFFT (Cooley-Tukey), boolean/fancy indexing, where (3-arg)
- **Security Fix:** verifyJWT now validates nbf (not-before) claim per RFC 7519
- **63 test files, 2,907 tests — all passing** (previously 2,544, +363 brutal tests)
- **59 entry points** (ESM + CJS + DTS) — added reactive, template, viz-data/svg
- **Auth tests:** 28 brutal tests (JWT, PKCE, Basic Auth) — 100% pass
- **HTTP tests:** 17 brutal tests (client, interceptors, error handling)
- **Documentation Integrity (PRD04):** SECURITY.md version table fixed, PUBLISH.md test count updated, README.md/SUMMARY.md synced with all 48 modules
- **All 2,907 tests passing — 63 test files, 0 failures**
- **TypeScript strict — 0 errors** (tsc --noEmit)
- Bundle size: ~28 KB gzip (full barrel)

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
