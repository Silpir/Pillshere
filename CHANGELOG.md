# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
