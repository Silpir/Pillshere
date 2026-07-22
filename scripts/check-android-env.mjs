#!/usr/bin/env node
/**
 * Pre-flight check for Android native builds.
 * Run this before `./gradlew assembleDebug` to verify the Android SDK is
 * reachable. It prints the exact fix for the current machine instead of letting
 * Gradle throw a cryptic `FileNotFoundException` for `local.properties`.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir, platform } from "node:os";

const androidNativeDir = resolve(import.meta.dirname, "..", "android-native");
const localPropertiesPath = join(androidNativeDir, "local.properties");

const isWindows = platform() === "win32";
const defaultSdkPath = isWindows
  ? `C:\\Users\\${process.env.USERNAME || "<you>"}\\AppData\\Local\\Android\\Sdk`
  : join(homedir(), "Library", "Android", "sdk");

function hasSdkDir() {
  if (!existsSync(localPropertiesPath)) return false;
  const text = readFileSync(localPropertiesPath, "utf8");
  return /^sdk\.dir\s*=.+/m.test(text);
}

function getAndroidHome() {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";
}

function sdkPathLooksValid(sdkPath) {
  if (!sdkPath) return false;
  const platforms = join(sdkPath, "platforms");
  const buildTools = join(sdkPath, "build-tools");
  return existsSync(platforms) && existsSync(buildTools);
}

const sdkFromEnv = getAndroidHome();
const sdkFromProps = hasSdkDir() ? "configured" : "";
const envValid = sdkPathLooksValid(sdkFromEnv);
const propsValid = sdkFromProps && sdkPathLooksValid(
  readFileSync(localPropertiesPath, "utf8")
    .match(/^sdk\.dir\s*=\s*(.+)$/m)?.[1]
    .trim()
);

if (envValid || propsValid) {
  console.log("✅ Android SDK is configured.");
  if (envValid) console.log(`   ANDROID_HOME: ${sdkFromEnv}`);
  if (propsValid) console.log(`   local.properties: ${localPropertiesPath}`);
  process.exit(0);
}

console.error("❌ Android SDK location not found.");
console.error("");

if (!sdkFromEnv && !sdkFromProps) {
  console.error("Gradle needs either ANDROID_HOME or android-native/local.properties.");
} else if (sdkFromEnv && !envValid) {
  console.error(`ANDROID_HOME is set but does not look like a valid SDK:`);
  console.error(`  ${sdkFromEnv}`);
  console.error("Expected folders like 'platforms' and 'build-tools' inside that path.");
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
console.error(`  Create ${localPropertiesPath} with this exact content:`);
console.error("");
console.error("  sdk.dir=C:\\\\Users\\\\<your-username>\\\\AppData\\\\Local\\\\Android\\\\Sdk");
console.error("");
console.error("Replace <your-username> with your actual Windows user name.");
console.error("If you installed Android Studio, confirm the SDK path under:");
console.error("  Settings → Languages & Frameworks → Android SDK");
console.error("");

process.exit(1);
