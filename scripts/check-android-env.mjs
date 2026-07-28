#!/usr/bin/env node
/**
 * Pre-flight check for Android native builds.
 * Run this before `./gradlew assembleDebug` to verify the Android SDK is
 * reachable. It prints the exact fix for the current machine instead of letting
 * Gradle throw a cryptic `FileNotFoundException` for `local.properties`.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir, platform } from "node:os";

const androidNativeDir = resolve(import.meta.dirname, "..", "android-native");
const localPropertiesPath = join(androidNativeDir, "local.properties");
const projectRoot = resolve(import.meta.dirname, "..");

const isWindows = platform() === "win32";
const defaultSdkPath = isWindows
  ? `C:\\Users\\${process.env.USERNAME || "<you>"}\\AppData\\Local\\Android\\Sdk`
  : join(homedir(), "Library", "Android", "sdk");

/**
 * Inspect android-native/local.properties without assuming it exists, is a
 * regular file, or is readable. Returns a small status object so every error
 * message below can name the exact absolute path involved.
 */
function inspectLocalProperties() {
  if (!existsSync(localPropertiesPath)) {
    return { state: "missing" };
  }
  let stats;
  try {
    stats = statSync(localPropertiesPath);
  } catch (error) {
    return { state: "unreadable", reason: error.message };
  }
  if (stats.isDirectory()) {
    return { state: "is-directory" };
  }
  if (!stats.isFile()) {
    return { state: "not-a-file" };
  }
  let text;
  try {
    text = readFileSync(localPropertiesPath, "utf8");
  } catch (error) {
    return { state: "unreadable", reason: error.message };
  }
  const match = text.match(/^\s*sdk\.dir\s*=\s*(.+)$/m);
  if (!match) {
    return { state: "no-sdk-dir" };
  }
  // Gradle properties escape Windows backslashes; unescape before checking.
  const sdkDir = match[1].trim().replace(/\\\\/g, "\\");
  if (!sdkDir) return { state: "empty-sdk-dir" };
  return { state: "ok", sdkDir };
}

function getAndroidHome() {
  return (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "").trim();
}

function sdkPathLooksValid(sdkPath) {
  if (!sdkPath) return false;
  const absolute = resolve(sdkPath);
  return existsSync(join(absolute, "platforms")) && existsSync(join(absolute, "build-tools"));
}

const sdkFromEnv = getAndroidHome();
const props = inspectLocalProperties();
const envValid = sdkPathLooksValid(sdkFromEnv);
const propsValid = props.state === "ok" && sdkPathLooksValid(props.sdkDir);

console.log(`Project root:        ${projectRoot}`);
console.log(`Android module:      ${androidNativeDir}`);
console.log(`local.properties:    ${localPropertiesPath}`);
console.log("");

if (envValid || propsValid) {
  console.log("✅ Android SDK is configured.");
  if (envValid) console.log(`   ANDROID_HOME -> ${resolve(sdkFromEnv)}`);
  if (propsValid) console.log(`   sdk.dir      -> ${resolve(props.sdkDir)}`);
  process.exit(0);
}

console.error("❌ Android SDK location not found.");
console.error("");

switch (props.state) {
  case "missing":
    console.error(`No file exists at: ${localPropertiesPath}`);
    break;
  case "is-directory":
    console.error(`A DIRECTORY exists where the file should be: ${localPropertiesPath}`);
    console.error("Delete that folder, then create a plain text file with the same name.");
    break;
  case "not-a-file":
    console.error(`Path exists but is not a regular file: ${localPropertiesPath}`);
    break;
  case "unreadable":
    console.error(`Could not read: ${localPropertiesPath}`);
    console.error(`  reason: ${props.reason}`);
    break;
  case "no-sdk-dir":
    console.error(`File exists but has no 'sdk.dir=' line: ${localPropertiesPath}`);
    break;
  case "empty-sdk-dir":
    console.error(`'sdk.dir=' is present but empty in: ${localPropertiesPath}`);
    break;
  case "ok":
    console.error(`'sdk.dir' does not look like a valid SDK: ${resolve(props.sdkDir)}`);
    console.error(`  configured in: ${localPropertiesPath}`);
    console.error("Expected 'platforms' and 'build-tools' folders inside that path.");
    break;
}

if (!sdkFromEnv) {
  console.error("ANDROID_HOME / ANDROID_SDK_ROOT are not set either.");
} else if (!envValid) {
  console.error(`ANDROID_HOME is set but does not look like a valid SDK: ${resolve(sdkFromEnv)}`);
  console.error("Expected 'platforms' and 'build-tools' folders inside that path.");
}

console.error("");
console.error("Fix this by choosing ONE of the following options:");
console.error("");
console.error("Option A — environment variable (works on all platforms):");
if (isWindows) {
  console.error(`  PowerShell: $env:ANDROID_HOME = "${defaultSdkPath}"`);
  console.error(`  cmd.exe:    set ANDROID_HOME=${defaultSdkPath}`);
} else {
  console.error(`  export ANDROID_HOME=${defaultSdkPath}`);
}
console.error("");
console.error("Option B — local.properties file (recommended for Windows):");
console.error("  Create this exact file (a FILE, not a folder):");
console.error(`    ${localPropertiesPath}`);
console.error("  with this single line of content:");
console.error("");
console.error("  sdk.dir=C:\\\\Users\\\\<your-username>\\\\AppData\\\\Local\\\\Android\\\\Sdk");
console.error("");
console.error("Replace <your-username> with your actual Windows user name.");
console.error("Run this check from the project root shown above:");
console.error("  bun run android:check-env");
console.error("If you installed Android Studio, confirm the SDK path under:");
console.error("  Settings → Languages & Frameworks → Android SDK");
console.error("");

process.exit(1);
