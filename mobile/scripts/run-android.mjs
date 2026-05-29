#!/usr/bin/env node
/**
 * Build web assets, sync Capacitor Android, launch emulator via `cap run android`.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyWindowsDevEnvFixes } from './fix-windows-java-home.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const skipEnv = process.argv.includes('--skip-env');

const fixNotes = applyWindowsDevEnvFixes();
if (fixNotes.length) {
  fixNotes.forEach((n) => console.log(`[rydo-mobile] ${n}`));
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: mobileRoot,
    shell: process.platform === 'win32',
    env: { ...process.env },
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function npm(script) {
  run('npm', ['run', script]);
}

function npx(capArgs) {
  run('npx', ['cap', ...capArgs]);
}

if (!skipEnv) {
  npm('env:android');
}

npm('build');

const androidDir = path.join(mobileRoot, 'android');
if (!fs.existsSync(androidDir)) {
  console.log('\nFirst run: adding Android platform…\n');
  npx(['add', 'android']);
}

npx(['sync', 'android']);

console.log('\nLaunching on Android (opens Android Studio / emulator)…\n');
npx(['run', 'android']);
