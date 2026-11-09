# To-Do List

Open work items, newest first. Move completed items to CHANGELOG at release time.

- Resolve TypeScript 7 vs typescript-eslint peer conflict (lint currently crashes: "typescript-eslint does not support TS 7") — either bump typescript-eslint when it supports TS 7 or pin TypeScript back until then
- Prune Bun `overrides` entries once upstream packages natively adopt the fixed versions

## Release process reminder
1. Bump `"version"` in `package.json` (patch = fixes/deps, minor = features)
2. Promote `[Unreleased]` section into a new dated entry in `CHANGELOG.md`
3. Create annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
4. Commit + push branch and tags (`git push origin main --tags`)
