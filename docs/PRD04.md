# PRD-04 — SpeexKit Documentation Audit & Forward Development Plan

> **Status:** Draft for review · **Author:** Audit pass (automated, cross-file consistency review)
> **Scope:** ARCHITECTURE.md, README.md, SUMMARY.md, CHANGELOG.md, ROADMAP.md, PUBLISH.md, SECURITY.md, SUPPORT.md, CONTRIBUTING.md, REFACTOR_LOG.md
> **Baseline version reviewed:** v1.4.14 (2026-06-30)

---

## 1. Executive Summary

The 9 documentation files reviewed describe a mature-looking package (500+ exports, 46 modules, 2,544 tests) but **the documents do not agree with each other** on basic facts: module count, module list, test count, repo branding, and project structure. None of these are stylistic nitpicks — they are the kind of discrepancy that erodes trust in a zero-dependency utility library whose entire value proposition is "audited, tested, production-grade." This PRD catalogs every concrete gap found, explains the likely root cause, and lays out a phased remediation + enhancement pipeline.

---

## 2. Gap Analysis (Cross-File Findings)

### 2.1 Module count and module list disagree across every file

| Source | Claimed module count | Modules actually enumerated |
|---|---|---|
| README.md / SUMMARY.md / CHANGELOG.md / ROADMAP.md | **46** | — |
| ARCHITECTURE.md §2 diagram + §3 source layout | (not explicitly counted) | **48** named modules, including `auth`, `http`, `serialize` |
| ROADMAP.md "New modules" list | "26 new" | **28** modules actually listed |

Counting ARCHITECTURE.md's own diagram: 8 core + 18 specialist + 22 platform = **48**, not 46. `auth`, `http`, and `serialize` appear in ARCHITECTURE.md's source layout and in ROADMAP's "new modules" list, but are **completely absent** from README.md's Features list, README.md's Modules table, and SUMMARY.md's Module Reference. Three modules that supposedly passed a "full PRD audit" in v1.4.14 are undocumented in the two files a new consumer would actually read.

**Impact:** A user installing `speexkit` cannot discover `speexkit/auth`, `speexkit/http`, or `speexkit/serialize` exist at all unless they read ARCHITECTURE.md's source tree directly.

### 2.2 Test count is stale in PUBLISH.md

CHANGELOG.md v1.4.14 and ARCHITECTURE.md both state **2,544 tests / 46 test files**. PUBLISH.md's release checklist still references **"1,503 tests passing"** — a number last accurate at v1.4.13. The publish checklist is the one document a maintainer relies on at the moment of shipping, and it's two releases out of date.

### 2.3 SECURITY.md was never updated past the pre-rebrand version scheme

SECURITY.md's supported-version table lists `0.8.x`, `0.7.x`, `<0.7`. The package is currently at **v1.4.14**. Per CHANGELOG.md, `0.8.x` was the *initial* release of the rebranded `speexkit` (formerly `speexjs-core`). There is no supported-version row for anything in the 1.x line — meaning, as written, the security policy currently claims **the live version of the package receives no security patches**, while versions 6+ minors behind are nominally supported. This is the single highest-severity documentation defect found: it is a security-relevant document that is factually wrong about which version is maintained.

### 2.4 Branding mismatch: package name vs. repository name

- Package name (per README.md, PUBLISH.md, CONTRIBUTING.md): `speexkit`
- GitHub repository referenced in README.md and SUPPORT.md: `github.com/superdevids/speexjs`
- CHANGELOG.md v0.8.x confirms the package was "rebranded from speexjs-core" to `speexkit`

The repo was never renamed (or the docs were never updated) to match the rebrand. New users clicking the README badge/link land on a repo called `speexjs`, not `speexkit` — a credibility gap for a library marketed on professionalism and audit rigor.

### 2.5 Project structure mismatch

CONTRIBUTING.md instructs contributors to `cd packages/speexkit`, implying a monorepo with a `packages/` directory. ARCHITECTURE.md's Source Layout (§3) begins at `speexkit/` as the repository root, with no `packages/` wrapper. Either CONTRIBUTING.md is stale (leftover from a prior monorepo structure) or ARCHITECTURE.md omits a directory level — either way, a new contributor's first command will likely fail.

### 2.6 Entry point math is unverifiable

CHANGELOG.md, ROADMAP.md, and ARCHITECTURE.md all cite **56 entry points**, but:
- The module count itself is disputed (46 vs. 48, see 2.1)
- CHANGELOG v1.4.13 mentions "5 sub-entry points" added for individual validators/error helpers (`isEmail`, `isURL`, `isUUID`, `MultiError`, `createError`) as a one-off addition, with no general rule documented for when a function gets its own entry point vs. living inside its parent module's entry
- No document states the formula (e.g., 1 entry per module + N granular sub-entries) that produces 56

**Impact:** The entry-point count cannot be independently verified from the docs as written; it reads as an asserted number rather than a derived one.

### 2.7 No migration/breaking-change documentation for the 0.x → 1.x rebrand

CHANGELOG.md jumps from `v0.8.x` (rebrand event) directly to `v1.4.7` with no entries for v0.9–v1.4.6, and no migration guide describing what (if anything) changed for consumers of `speexjs-core` moving to `speexkit`. For a rebrand that changes the package name itself, this is a missing artifact that every consumer needs and no current file provides.

### 2.8 Bundle size claims don't account for module growth

README.md and CHANGELOG.md both state the full barrel is **~28 KB gzip** at v1.4.14 (46–48 modules). REFACTOR_LOG.md (an earlier v1.4.10→v1.4.11 pass) records the bundle at **~200 KB uncompressed**, "unchanged" through that refactor. Between that point and v1.4.14, 23–28 new modules were added (per ROADMAP.md), yet the only published gzip figure (28 KB) is never shown at a prior checkpoint for comparison — there is no documented before/after, so it's impossible to tell from the docs whether 28 KB reflects the current 46–48-module barrel or is a leftover figure from a smaller module set.

### 2.9 No engines / runtime compatibility statement anywhere

ARCHITECTURE.md states the package "targets ES2022+ only, assumes modern runtime" and ships dual ESM+CJS — but no file (README, ARCHITECTURE, CONTRIBUTING) states a minimum Node.js version, browser support matrix, or a `package.json` `engines` field. For a library explicitly positioning itself against `lodash`/`date-fns` (which do document this), this is a gap that affects adoption decisions.

### 2.10 No LICENSE artifact referenced, despite being claimed

README.md states "MIT license" under Quality, but no `LICENSE` file is among the uploaded docs, and no other file (CONTRIBUTING, PUBLISH) references checking for or maintaining one. Not necessarily missing from the repo, but undocumented in every file that should mention it.

### 2.11 CHANGELOG "previously 35 failures fixed" is undated and untraceable

CHANGELOG.md v1.4.14 mentions fixing "35 failures" as part of the "Full PRD audit," but no prior CHANGELOG entry (v1.4.13, v1.4.10, etc.) reports introducing or carrying 35 failures forward. Either an interim release was never logged, or the number refers to failures discovered and fixed within the same audit cycle — the document doesn't disambiguate, which matters for anyone trying to reconstruct release history.

### 2.12 Minor: inconsistent date precision

Several files (CHANGELOG, SUMMARY, ARCHITECTURE) all carry the exact same `2026-06-30` "last updated" stamp despite covering different scopes and depths of detail — plausible if genuinely updated together, but combined with the module-count and module-list mismatches in §2.1, suggests the date stamp was bulk-updated without the content underneath actually being reconciled.

---

## 3. Root Cause Assessment

The pattern across nearly every finding is the same: **CONTRIBUTING.md's own process ("Update SUMMARY.md" as step 6 of adding a module) was not followed for the last 2–3 modules added (`auth`, `http`, `serialize`)**, and no equivalent step exists for README.md, SECURITY.md's version table, or PUBLISH.md's test count. There is no single source of truth (e.g., a generated module manifest) that the other docs render from — every file maintains its own hand-written copy of "the list of modules" and "the test count," so they drift independently every release.

---

## 4. Development & Improvement Pipeline

### Phase 0 — Documentation Integrity (P0, before next release)
1. Reconcile the true module count and list. Pick one canonical list (recommend: generate it from `tsup.config.ts` / `package.json` exports at build time).
2. Add `auth`, `http`, `serialize` to README.md Features, README.md Modules table, and SUMMARY.md Module Reference — or remove them from ARCHITECTURE.md/ROADMAP.md if they are not actually shipped yet.
3. Update SECURITY.md's supported-version table to reflect the 1.x line as the actively patched version; deprecate 0.7.x/0.8.x explicitly.
4. Fix PUBLISH.md's checklist test count to match CHANGELOG (2,544) and add a checklist item: *"cross-check SUMMARY.md, README.md, ARCHITECTURE.md module lists before tagging."*
5. Resolve the `speexjs` vs. `speexkit` repo/package naming mismatch — either rename the repo or update every link.
6. Resolve `CONTRIBUTING.md`'s `packages/speexkit` path against ARCHITECTURE.md's flat layout.

### Phase 1 — Single Source of Truth Tooling (P0/P1)
1. Build a small internal script (could live in the existing `scanner`/`analyzer`/`dep-exray` modules — dogfooding) that introspects `tsup.config.ts` entry points and emits a `modules.json` manifest (name, export list, entry point path, test file, doc status).
2. Generate the README.md Modules table and SUMMARY.md Module Reference from that manifest in CI, so they can never drift again.
3. Add a CI check that fails the build if a module's source folder has no matching row in `modules.json`, no test file, or no doc entry (closes the exact gap that produced §2.1).
4. Add a CI check that fails if PUBLISH.md's recorded test count doesn't match the live `vitest` run output (or replace the hardcoded count with a templated badge).

### Phase 2 — Missing Artifacts (P1)
1. Write a `MIGRATION.md` covering the `speexjs-core` → `speexkit` rebrand (even retroactively) — what import paths changed, what (if anything) is a breaking change, and the version boundary.
2. Add an `engines` field to `package.json` and document the supported Node.js version range and browser/runtime targets in README.md and ARCHITECTURE.md.
3. Add a `LICENSE` file if not already present, and reference it from README.md, CONTRIBUTING.md, and PUBLISH.md's checklist.
4. Document the entry-point formula explicitly in ARCHITECTURE.md §6 (Build Configuration): which exports get their own deep-import path vs. which live inside a parent module only — turning "56 entry points" from an assertion into a derivable fact.

### Phase 3 — Roadmap-Aligned Feature Work (P2, continues ROADMAP.md v1.5.0/v1.6.0)
These are additive and consistent with the existing roadmap direction (ML/stats maturity, reactive primitives, encryption) rather than scope changes:
1. **ML module:** PCA, Logistic Regression, KD-tree-accelerated KNN — as already planned in ROADMAP v1.5.0, plus add explicit test-coverage targets per algorithm (closing the existing gap that ML/Stats/Viz modules are flagged in ROADMAP as needing coverage work even though CHANGELOG v1.4.14 claims "all modules fully implemented and tested").
2. **NDArray:** SVD decomposition, boolean/fancy indexing — already roadmapped; pair each with an ARCHITECTURE.md §8 update so NDArray internals docs stay in sync with capability.
3. **security module:** AES-GCM encrypt/decrypt (already roadmapped for v1.6.0) — should also get a SECURITY.md note clarifying it as the first export in the package suitable for genuinely sensitive data, contrasted explicitly against the existing `xorCipher`/`simpleHash` "not for security-critical use" warning.
4. **stats module:** Chi-square, ANOVA (already roadmapped) — extend `viz-data` in the same release so new tests have matching plotting/inspection support, since the two modules are documented as a pair everywhere else.

### Phase 4 — Process Hardening (P2/P3)
1. Formalize a release-note template so CHANGELOG entries always state, per release: modules added/changed, net test delta, entry-point delta, and any doc files touched — preventing silent doc drift like §2.1–2.6 from recurring.
2. Add a "Documentation Consistency" section to CONTRIBUTING.md's PR Process checklist, mirroring the existing "Update SUMMARY.md" step but extended to README.md, ARCHITECTURE.md, and SECURITY.md whenever a module is added or a version is cut.
3. Add automated dependency/version-table validation to `dep-exray`'s own CLI (dogfood it against the project's own SECURITY.md) so the tool that exists specifically to flag stale dependency/security data can flag stale data in the project that built it.

---

## 5. Prioritized Backlog (P0 → P4)

| Priority | Item | File(s) affected | Effort |
|---|---|---|---|
| P0 | Fix SECURITY.md supported-version table | SECURITY.md | XS |
| P0 | Reconcile module count/list (46 vs 48) | README.md, SUMMARY.md, ARCHITECTURE.md, ROADMAP.md | S |
| P0 | Document `auth`, `http`, `serialize` modules publicly | README.md, SUMMARY.md | S |
| P0 | Update PUBLISH.md test count + add doc-sync checklist item | PUBLISH.md | XS |
| P1 | Resolve `speexjs`/`speexkit` repo naming | README.md, SUPPORT.md | XS |
| P1 | Resolve `packages/speexkit` vs. flat layout | CONTRIBUTING.md or ARCHITECTURE.md | XS |
| P1 | Build module manifest + CI doc-drift check | tooling (new), CI config | M |
| P1 | Write MIGRATION.md for the rebrand | new file | S |
| P2 | Add `engines` field + runtime support docs | package.json, README.md, ARCHITECTURE.md | S |
| P2 | Document entry-point generation rule | ARCHITECTURE.md §6 | S |
| P2 | Add/confirm LICENSE file + references | new/existing file, README.md, CONTRIBUTING.md | XS |
| P3 | PCA, Logistic Regression, KD-tree KNN | src/ml | M |
| P3 | NDArray SVD, fancy indexing | src/nlarray | M |
| P3 | AES-GCM in security module | src/security | M |
| P3 | Chi-square/ANOVA in stats + viz-data pairing | src/stats, src/viz-data | M |
| P4 | Release-note template + CONTRIBUTING doc-sync step | CONTRIBUTING.md | XS |
| P4 | dep-exray self-check against project's own SECURITY.md | src/dep-exray | M |

---

## 6. Acceptance Criteria for "Documentation Integrity" Milestone

- [ ] Every module present in `tsup.config.ts` appears, with an identical name, in README.md, SUMMARY.md, and ARCHITECTURE.md.
- [ ] Module count cited in CHANGELOG.md, README.md, SUMMARY.md, and ROADMAP.md is identical and matches the manifest.
- [ ] SECURITY.md's supported-version table includes the current minor version line.
- [ ] PUBLISH.md's test count matches the latest CHANGELOG entry at time of tagging.
- [ ] All internal repo links resolve to the same repository name as the published package name.
- [ ] CONTRIBUTING.md's setup commands succeed on a clean checkout, as written.
- [ ] A CI job fails the build if any of the above drift on a PR.

---

## 7. Success Metrics

| Metric | Current | Target after Phase 0–1 |
|---|---|---|
| Cross-file module count agreement | 0/4 files agree | 4/4 files agree |
| Undocumented-but-shipped modules | 3 (`auth`, `http`, `serialize`) | 0 |
| Stale numeric claims (tests, versions) found per release | ≥2 (this audit) | 0, enforced by CI |
| Time for a new contributor to get `npm install && npm test` working from CONTRIBUTING.md alone | Unverified / likely fails on `cd packages/speexkit` | 100% success on clean checkout |

---

*This PRD is additive to, and should be read alongside, `docs/PRD01.md` (referenced by SUMMARY.md and ROADMAP.md) and does not propose changing the existing feature roadmap direction — only correcting the documentation that describes it and hardening the process that keeps it accurate going forward.*