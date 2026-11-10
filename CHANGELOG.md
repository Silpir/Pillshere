# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-11-09

### Added
- Per-medication pill color coding: fixed 10-color palette (`ui/theme/Palette.kt`) with a swatch picker on the med edit screen; new meds auto-assigned the first unused slot. Colored identity dots on the Meds list and Today cards; Room schema bumped to v3 (`MIGRATION_2_3`) with exported JSON schemas now committed under `app/schemas/`

### Changed
- Typography increased by +2sp across all Material 3 text styles via a custom `Typography` passed into `MaterialTheme` (single source of truth, no per-screen edits)
- Today screen cards are content-sized at natural height instead of stretching to fill when there are few doses; taken doses fade their tint from 0.30 → 0.12 alpha for subtle completion feedback while keeping hue recognition

### Fixed
- `Schedule.upcomingFireTimes` anchored its scan window to wall-clock "today" instead of the injected `now`, so deterministic/backfilled lookups silently returned nothing — now derived from `now`; caught by the previously never-run unit test suite

## [0.2.0] - 2026-11-09

### Removed
- Legacy TanStack Start reference build (`src/`, Vite config, npm/Bun dependency graph) and all remaining Capacitor remnants (no-op platform shims, WebView workarounds, `scripts/build-capacitor-web.mjs`)
- Repo is now a pure native Android project under `android-native/`; deleted sources remain recoverable via git history and older tags

### Changed
- Rewrote security CI for Gradle (OSV Scanner on version catalog + Gitleaks secret scan); dependabot now tracks the `gradle` ecosystem in `/android-native` instead of root npm
- Aligned app `versionName`/`versionCode` with repository tag scheme (v0.x.y)

## [0.1.0] - 2026-11-09

### Added
- Per-medication notification opt-in/out settings
- Improved timeline row details view

### Fixed
- Weight import issue
- Dependency security advisories (GHSA) — vulnerable transitive dependencies resolved via Bun `overrides` (`@babel/core`, `glob`, `js-yaml`, `tar`, etc.); full audit now reports zero vulnerabilities

### Removed
- Capacitor from the web build (mobile tooling no longer part of the default bundle)

### Changed
- Pinned audited dependency versions and updated lockfile for reproducible installs
