# Roadmap

> 📋 For the full product roadmap with feature priorities (P0–P4), see [PRD01.md](./docs/PRD01.md).

## v1.4.14 — Current

- **46 modules** (20 original + 26 new), 500+ exports, 2,544 tests, 56 entry points
- **New modules:** config, cache, cli, queue, resilience, security, dom, events, intl, observability, state-machine, realtime, feature-flags, reporter, schema, mock, units, geo, diff, storage, expansion, coverage-boost, analyzer, scanner, known-mappings, http, auth, serialize
- **Zero-dependency** — ESM + CJS dual build (tsup, 56 entry points)
- **TypeScript strict** — 0 errors (tsc --noEmit), noUncheckedIndexedAccess
- **All 2,544 tests passing** — 46 test files
- **PRD audit complete** — all 23 new modules already fully implemented
- **Enhanced modules:** config (loadConfig skips missing files), security (iterative sanitization), queue (clamp min interval), cli (ESM mocking), dom (sync/async consistency), cache (capacity guards), resilience (HALF_OPEN transition)

## v1.5.0 — Planned

- PCA (Principal Component Analysis)
- Logistic Regression
- KNN KD-tree optimization for large datasets
- NDArray — SVD decomposition
- NDArray — boolean/fancy indexing
- Test coverage for ML/Stats/Viz modules

## v1.6.0 — Planned

- Reactive signals (signal/computed/effect)
- Streaming CSV/JSONL parser
- AES-GCM encrypt/decrypt
- Chi-square test, ANOVA test
- Template engine (mustache-like)
