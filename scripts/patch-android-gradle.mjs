#!/usr/bin/env node
// Removes Capacitor's generated flatDir repository when the generated
// Cordova-compat module has no local .jar/.aar artifacts. Gradle warns about
// flatDir because it has no dependency metadata; keeping it only makes sense
// when a Cordova plugin actually ships local binaries.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const gradlePath = join("android", "capacitor-cordova-android-plugins", "build.gradle");
const libDirs = [
  join("android", "capacitor-cordova-android-plugins", "src", "main", "libs"),
  join("android", "capacitor-cordova-android-plugins", "libs"),
];

function hasLocalBinary(dir) {
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { withFileTypes: true }).some((entry) => {
    if (!entry.isFile()) return false;
    return /\.(?:aar|jar)$/i.test(entry.name);
  });
}

if (!existsSync(gradlePath)) {
  console.warn("[patch-android-gradle] android/ not present — skipping flatDir cleanup.");
  process.exit(0);
}

if (libDirs.some(hasLocalBinary)) {
  console.warn("[patch-android-gradle] local Cordova binaries found — keeping flatDir.");
  process.exit(0);
}

const source = readFileSync(gradlePath, "utf8");
const patched = source.replace(/\n\s*flatDir\s*\{[\s\S]*?dirs[\s\S]*?\n\s*\}/m, "");

if (patched === source) {
  console.log("[patch-android-gradle] no flatDir repository to remove.");
} else {
  writeFileSync(gradlePath, patched);
  console.log("[patch-android-gradle] removed unused flatDir repository.");
}