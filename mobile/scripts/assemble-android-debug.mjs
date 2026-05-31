#!/usr/bin/env node
/**
 * Run Gradle assembleDebug. Use log-apk-artifact.mjs to print the APK summary.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyWindowsDevEnvFixes } from './fix-windows-java-home.mjs';
import { debugApkPath } from './log-apk-artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const androidDir = path.join(mobileRoot, 'android');
const printSummary = !process.argv.includes('--quiet');

const fixNotes = applyWindowsDevEnvFixes();
if (fixNotes.length) {
  fixNotes.forEach((n) => console.log(`[rydo-mobile] ${n}`));
}

if (!fs.existsSync(androidDir)) {
  console.error('[rydo-mobile] android/ not found — run: npm run cap:add:android');
  process.exit(1);
}

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

console.log('\nBuilding debug APK (assembleDebug)…\n');

const r = spawnSync(gradlew, ['assembleDebug'], {
  stdio: 'inherit',
  cwd: androidDir,
  shell: process.platform === 'win32',
  env: { ...process.env },
});

if (r.status !== 0) process.exit(r.status ?? 1);

if (!fs.existsSync(debugApkPath)) {
  console.error(`[rydo-mobile] assembleDebug finished but APK not found at ${debugApkPath}`);
  process.exit(1);
}

if (printSummary) {
  const logScript = path.join(__dirname, 'log-apk-artifact.mjs');
  const logArgs = [logScript];
  if (process.argv.includes('--reveal')) logArgs.push('--reveal');
  const logResult = spawnSync('node', logArgs, {
    stdio: 'inherit',
    cwd: mobileRoot,
    shell: process.platform === 'win32',
    env: { ...process.env },
  });
  if (logResult.status !== 0) process.exit(logResult.status ?? 1);
}
