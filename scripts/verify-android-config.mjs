#!/usr/bin/env node
// Preflight for `bun run android:*`. Confirms capacitor.config.ts,
// vite.capacitor.config.ts, and (when present) the generated android/
// project agree on appId/namespace and webDir/asset-copy path.
//
// Runs as part of android:add and android:sync so drift fails fast
// instead of surfacing as a Gradle or Capacitor copy error later.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const errors = [];
const warn = (msg) => console.warn(`[verify-android-config] ${msg}`);
const fail = (msg) => errors.push(msg);

function hasLocalBinary(dir) {
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { withFileTypes: true }).some((entry) => {
    if (!entry.isFile()) return false;
    return /\.(?:aar|jar)$/i.test(entry.name);
  });
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function extract(source, regex, label) {
  const m = source.match(regex);
  if (!m) {
    fail(`Could not find ${label}.`);
    return null;
  }
  return m[1];
}

// 1. capacitor.config.ts — source of truth for appId and webDir.
const capSrc = read("capacitor.config.ts");
if (!capSrc) {
  fail("capacitor.config.ts is missing.");
} else {
  var appId = extract(capSrc, /appId:\s*["']([^"']+)["']/, "appId in capacitor.config.ts");
  var webDir = extract(capSrc, /webDir:\s*["']([^"']+)["']/, "webDir in capacitor.config.ts");
}

// 2. vite.capacitor.config.ts — outDir must equal capacitor webDir.
const viteSrc = read("vite.capacitor.config.ts");
if (!viteSrc) {
  fail("vite.capacitor.config.ts is missing.");
} else if (webDir) {
  const outDir = extract(viteSrc, /outDir:\s*["']([^"']+)["']/, "outDir in vite.capacitor.config.ts");
  if (outDir && outDir !== webDir) {
    fail(
      `vite outDir "${outDir}" does not match capacitor webDir "${webDir}". ` +
        `Capacitor will not find index.html.`,
    );
  }
}

// 3. android/ project — validate namespace + manifest, if it exists.
const androidDir = "android";
if (existsSync(androidDir)) {
  const gradlePath = join(androidDir, "app", "build.gradle");
  const manifestPath = join(androidDir, "app", "src", "main", "AndroidManifest.xml");
  const cordovaGradlePath = join(androidDir, "capacitor-cordova-android-plugins", "build.gradle");

  const gradle = read(gradlePath);
  if (!gradle) {
    fail(`${gradlePath} is missing — re-run \`bun run android:add\`.`);
  } else if (appId) {
    const ns = gradle.match(/namespace\s*=?\s*["']([^"']+)["']/);
    if (!ns) {
      fail(
        `${gradlePath} has no \`namespace\` declaration. AGP 8+ requires ` +
          `\`namespace = "${appId}"\` inside the android { } block.`,
      );
    } else if (ns[1] !== appId) {
      fail(
        `${gradlePath} namespace "${ns[1]}" does not match capacitor appId "${appId}".`,
      );
    }

    const appIdLine = gradle.match(/applicationId\s+["']([^"']+)["']/);
    if (appIdLine && appIdLine[1] !== appId) {
      fail(
        `${gradlePath} applicationId "${appIdLine[1]}" does not match ` +
          `capacitor appId "${appId}".`,
      );
    }
  }

  const manifest = read(manifestPath);
  if (!manifest) {
    fail(`${manifestPath} is missing — re-run \`bun run android:add\`.`);
  } else if (/<manifest[^>]*\spackage\s*=/.test(manifest)) {
    fail(
      `${manifestPath} still sets a \`package="..."\` attribute on <manifest>. ` +
        `AGP 8+ forbids setting both package and namespace — remove the package attribute.`,
    );
  }

  const cordovaGradle = read(cordovaGradlePath);
  if (cordovaGradle && /flatDir\s*\{/.test(cordovaGradle)) {
    const hasLocalArtifacts = [
      join(androidDir, "capacitor-cordova-android-plugins", "src", "main", "libs"),
      join(androidDir, "capacitor-cordova-android-plugins", "libs"),
    ].some(hasLocalBinary);
    if (!hasLocalArtifacts) {
      fail(
        `${cordovaGradlePath} still contains an unused \`flatDir\` repository. ` +
          `Run \`bun run android:sync\` so scripts/patch-android-gradle.mjs removes it.`,
      );
    } else {
      warn(`${cordovaGradlePath} keeps flatDir because local Cordova binaries are present.`);
    }
  }
} else {
  warn("android/ not present — skipping native project checks. Run `bun run android:add` first.");
}

if (errors.length > 0) {
  console.error("\nAndroid config drift detected:");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nSee MOBILE.md → Gradle: \"Namespace not specified\".\n");
  process.exit(1);
}

console.log("[verify-android-config] OK");