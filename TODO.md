# To-Do List

Open work items, newest first. Move completed items to CHANGELOG at release time.

- Verify the rewritten `security.yml` OSV scan actually reports Gradle dependencies on its next GitHub Actions run (no lockfile is committed for android-native yet)
- Consider committing a Gradle dependency lockfile (`dependencyLocking`) so audits and builds are fully reproducible
- Better UI / simpler confirmation with working alarm system / refill automation / better statistics & history visualisation (see README TO-DO)

## Release process reminder
1. Bump `versionCode` (+1) and `versionName` (X.Y.Z) in `android-native/app/build.gradle.kts` — patch = fixes/deps, minor = features/structural changes
2. Promote `[Unreleased]` section into a new dated entry in `CHANGELOG.md`
3. Create annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
4. Commit + push branch and tags (`git push origin main --tags`)
