#!/usr/bin/env node
/**
 * Git Bash / old terminals often keep JAVA_HOME=...\bin\java.exe even after User env is fixed.
 * Reads the correct User JAVA_HOME from Windows and applies it to process.env for child processes.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/** @param {string | undefined} home */
export function isInvalidJavaHome(home) {
  if (!home) return false;
  const n = home.replace(/\\/g, '/').toLowerCase();
  return n.endsWith('/java.exe') || n.endsWith('/java') || n.endsWith('/bin/java.exe');
}

/** @param {string} home */
export function normalizeJavaHomeFromExePath(home) {
  const normalized = home.replace(/\\/g, '/');
  if (normalized.toLowerCase().endsWith('/bin/java.exe')) {
    return path.resolve(home, '..', '..');
  }
  if (normalized.toLowerCase().endsWith('/java.exe')) {
    return path.resolve(home, '..');
  }
  return home;
}

/** Capacitor 7 Android compiles with Java 21 source level. */
export const MIN_JAVA_MAJOR = 21;

function readWindowsUserJavaHome() {
  if (process.platform !== 'win32') return null;
  try {
    const out = execSync(
      'powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'JAVA_HOME\',\'User\')"',
      { encoding: 'utf8' },
    );
    const v = out.replace(/\r?\n/g, '').trim();
    return v || null;
  } catch {
    return null;
  }
}

/** @param {string} javaHome */
export function getJavaMajor(javaHome) {
  const javaExe = path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
  if (!fs.existsSync(javaExe)) return 0;
  try {
    const out = execSync(`"${javaExe}" -version 2>&1`, { encoding: 'utf8' });
    const m = out.match(/version "(\d+)/);
    return m ? Number.parseInt(m[1], 10) : 0;
  } catch {
    return 0;
  }
}

/** @returns {string | null} */
function findJdk21PlusOnWindows() {
  if (process.platform !== 'win32') return null;
  const roots = [
    path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Java'),
    path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Eclipse Adoptium'),
    path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Microsoft'),
  ];
  /** @type {{ major: number, home: string }[]} */
  const found = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) {
      if (!/^jdk-/i.test(name)) continue;
      const home = path.join(root, name);
      const major = getJavaMajor(home);
      if (major >= MIN_JAVA_MAJOR) found.push({ major, home });
    }
  }
  found.sort((a, b) => b.major - a.major);
  return found[0]?.home ?? null;
}

/**
 * Fix process.env.JAVA_HOME when possible. Returns the effective JAVA_HOME.
 * @returns {{ javaHome: string | undefined, fixed: boolean, message?: string }}
 */
export function applyJavaHomeFix() {
  let home = process.env.JAVA_HOME;
  let fixed = false;
  let message;

  if (isInvalidJavaHome(home)) {
    const fromUser = readWindowsUserJavaHome();
    if (fromUser && !isInvalidJavaHome(fromUser) && fs.existsSync(fromUser)) {
      process.env.JAVA_HOME = fromUser;
      home = fromUser;
      fixed = true;
      message =
        'Shell had JAVA_HOME pointing at java.exe; using Windows User env instead. Restart the terminal to pick up the fix permanently.';
    } else if (home) {
      const derived = normalizeJavaHomeFromExePath(home);
      if (fs.existsSync(derived)) {
        process.env.JAVA_HOME = derived;
        home = derived;
        fixed = true;
        message = `Corrected JAVA_HOME to ${derived}`;
      }
    }
  }

  if (!home) {
    const fromUser = readWindowsUserJavaHome();
    if (fromUser && fs.existsSync(fromUser)) {
      process.env.JAVA_HOME = fromUser;
      home = fromUser;
      fixed = true;
      message = 'Set JAVA_HOME from Windows User environment.';
    }
  }

  if (home && getJavaMajor(home) < MIN_JAVA_MAJOR) {
    const better = findJdk21PlusOnWindows();
    if (better) {
      process.env.JAVA_HOME = better;
      home = better;
      fixed = true;
      message = `Capacitor needs Java ${MIN_JAVA_MAJOR}+; using ${better} (run setup-windows-env.ps1 to persist).`;
    }
  }

  return { javaHome: home, fixed, message };
}

function readWindowsUserEnv(name) {
  if (process.platform !== 'win32') return null;
  try {
    const out = execSync(
      `powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('${name}','User')"`,
      { encoding: 'utf8' },
    );
    const v = out.replace(/\r?\n/g, '').trim();
    return v || null;
  } catch {
    return null;
  }
}

/** Apply ANDROID_HOME / ANDROID_SDK_ROOT from Windows User env when missing in shell. */
export function applyAndroidSdkFix() {
  if (process.env.ANDROID_HOME) return;
  const sdk = readWindowsUserEnv('ANDROID_HOME') || readWindowsUserEnv('ANDROID_SDK_ROOT');
  if (sdk && fs.existsSync(sdk)) {
    process.env.ANDROID_HOME = sdk;
    process.env.ANDROID_SDK_ROOT = sdk;
    return sdk;
  }
  return null;
}

/** @returns {string[]} notes for the user */
export function applyWindowsDevEnvFixes() {
  const notes = [];
  const j = applyJavaHomeFix();
  if (j.message) notes.push(j.message);
  const sdk = applyAndroidSdkFix();
  if (sdk && !notes.some((n) => n.includes('ANDROID'))) {
    notes.push(`Using ANDROID_HOME from Windows User env: ${sdk}`);
  }
  return notes;
}
