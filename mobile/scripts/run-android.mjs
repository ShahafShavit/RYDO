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

function runCapture(cmd, args) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    cwd: mobileRoot,
    shell: process.platform === 'win32',
    env: { ...process.env },
  });
  if (r.status !== 0) {
    return { ok: false, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
  }
  return { ok: true, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

function npm(script) {
  run('npm', ['run', script]);
}

function npx(capArgs) {
  run('npx', ['cap', ...capArgs]);
}

function readArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

/** Prefer a running adb device; otherwise bootable Capacitor AVD target. */
function resolveAndroidTarget() {
  const explicit = readArgValue('--target');
  if (explicit) {
    return explicit;
  }

  const adb = runCapture('adb', ['devices']);
  if (adb.ok) {
    const connected = (adb.stdout || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.endsWith('\tdevice'))
      .map((line) => line.split('\t')[0])
      .filter(Boolean);

    if (connected.length === 1) {
      console.log(`[rydo-mobile] Using connected device: ${connected[0]}`);
      return connected[0];
    }
    if (connected.length > 1) {
      console.log(`[rydo-mobile] Multiple devices connected: ${connected.join(', ')}`);
      console.log('[rydo-mobile] Pass --target <id>, e.g. --target emulator-5554');
      return connected[0];
    }
  }

  const listed = runCapture('npx', ['cap', 'run', 'android', '--list']);
  if (listed.ok) {
    const targets = (listed.stdout || '')
      .split(/\r?\n/)
      .slice(2)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\s{2,}/);
        return parts[parts.length - 1]?.trim() ?? '';
      })
      .filter(Boolean);

    const running = targets.find((id) => id.startsWith('emulator-'));
    if (running) {
      console.log(`[rydo-mobile] Using Capacitor target: ${running}`);
      return running;
    }

    const avd = targets.find((id) => !id.startsWith('emulator-'));
    if (avd) {
      console.log(`[rydo-mobile] No device running; Capacitor will boot: ${avd}`);
      return avd;
    }
  }

  return null;
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

const target = resolveAndroidTarget();
const capRunArgs = ['run', 'android'];
if (target) {
  capRunArgs.push('--target', target);
}

console.log('\nLaunching on Android…\n');
npx(capRunArgs);
