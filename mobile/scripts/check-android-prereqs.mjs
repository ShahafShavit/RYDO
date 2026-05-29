#!/usr/bin/env node
/**
 * Prints Android/Capacitor prerequisite hints before `npm run run:android`.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import {
  applyWindowsDevEnvFixes,
  getJavaMajor,
  isInvalidJavaHome,
  MIN_JAVA_MAJOR,
} from './fix-windows-java-home.mjs';

const notes = applyWindowsDevEnvFixes();

const issues = [];
const hints = [];

function checkJavaHome() {
  const home = process.env.JAVA_HOME;
  if (!home) {
    issues.push('JAVA_HOME is not set.');
    hints.push('Run: powershell -File scripts/setup-windows-env.ps1 -Install  then restart the terminal.');
    hints.push('  Or configure only (if already installed): powershell -File scripts/setup-windows-env.ps1');
    hints.push('  Or: source scripts/android-env.sh  (Git Bash, current session only)');
    return;
  }
  if (isInvalidJavaHome(home)) {
    issues.push(`JAVA_HOME points at java.exe: ${home}`);
    hints.push('Restart the terminal, or run: source scripts/android-env.sh');
    hints.push('  Windows User env may already be correct — this shell inherited an old value.');
  } else if (!fs.existsSync(home)) {
    issues.push(`JAVA_HOME path does not exist: ${home}`);
  } else {
    const major = getJavaMajor(home);
    if (major > 0 && major < MIN_JAVA_MAJOR) {
      issues.push(`Java ${major} at JAVA_HOME — Capacitor 7 Android needs Java ${MIN_JAVA_MAJOR}+.`);
      hints.push('Run: powershell -File scripts/setup-windows-env.ps1 -Install');
    }
  }
}

function checkAndroidSdk() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) {
    issues.push('ANDROID_HOME / ANDROID_SDK_ROOT is not set.');
    hints.push('Run: powershell -File scripts/setup-windows-env.ps1 -Install');
    return;
  }
  if (!fs.existsSync(sdk)) {
    issues.push(`Android SDK path does not exist: ${sdk}`);
  }
}

function checkAdbDevices() {
  const r = spawnSync('adb', ['devices'], { encoding: 'utf8', shell: true });
  if (r.error || r.status !== 0) return;
  const lines = (r.stdout || '').split(/\r?\n/).filter((l) => l.includes('\tdevice'));
  if (lines.length === 0) {
    hints.push('No Android device/emulator running. Start an AVD in Android Studio (Device Manager) first.');
  } else {
    console.log(`ADB devices: ${lines.length} ready`);
  }
}

checkJavaHome();
checkAndroidSdk();

console.log('\n--- RYDO Android prerequisites ---\n');

if (notes.length) {
  notes.forEach((n) => console.log(`Note: ${n}\n`));
}

if (issues.length) {
  console.log('Issues:');
  issues.forEach((i) => console.log(`  ✗ ${i}`));
  console.log('\nHints:');
  hints.forEach((h) => console.log(`  ${h}`));
  console.log('\nDocs: mobile/README.md → "Run on Android emulator"\n');
  process.exit(1);
}

console.log('JAVA_HOME:', process.env.JAVA_HOME);
console.log('ANDROID_HOME:', process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT);
checkAdbDevices();
console.log('\nOK — try: npm run run:android\n');
