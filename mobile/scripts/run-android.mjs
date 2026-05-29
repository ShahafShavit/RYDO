#!/usr/bin/env node
/**
 * Build web assets, sync Capacitor Android, launch on USB device or emulator.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyWindowsDevEnvFixes } from './fix-windows-java-home.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const skipEnv = process.argv.includes('--skip-env');
const useDotnet = process.argv.includes('--dotnet');

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

function parseAdbDevices(stdout) {
  return (stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('\tdevice'))
    .map((line) => line.split('\t')[0])
    .filter(Boolean)
    .map((id) => ({
      id,
      kind: id.startsWith('emulator-') ? 'emulator' : 'physical',
    }));
}

/** Prefer USB device, then running emulator, then bootable Capacitor AVD target. */
function resolveAndroidTarget() {
  const explicit = readArgValue('--target');
  if (explicit) {
    return {
      id: explicit,
      kind: explicit.startsWith('emulator-') ? 'emulator' : 'physical',
      source: 'explicit',
    };
  }

  const adb = runCapture('adb', ['devices']);
  if (adb.ok) {
    const devices = parseAdbDevices(adb.stdout);
    const physical = devices.filter((d) => d.kind === 'physical');
    const emulators = devices.filter((d) => d.kind === 'emulator');

    if (physical.length === 1) {
      console.log(`[rydo-mobile] Using USB device: ${physical[0].id}`);
      return { ...physical[0], source: 'adb' };
    }
    if (physical.length > 1) {
      console.log(`[rydo-mobile] Multiple USB devices: ${physical.map((d) => d.id).join(', ')}`);
      console.log('[rydo-mobile] Pass --target <id> to pick one');
      return { ...physical[0], source: 'adb' };
    }
    if (emulators.length >= 1) {
      console.log(`[rydo-mobile] No USB device; using emulator: ${emulators[0].id}`);
      return { ...emulators[0], source: 'adb' };
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
        const id = parts[parts.length - 1]?.trim() ?? '';
        return {
          id,
          isEmulator: /\(emulator\)/i.test(line),
        };
      })
      .filter((t) => t.id);

    const running = targets.find((t) => t.id.startsWith('emulator-'));
    if (running) {
      console.log(`[rydo-mobile] Using Capacitor target: ${running.id}`);
      return { id: running.id, kind: 'emulator', source: 'cap-list' };
    }

    const avd = targets.find((t) => t.isEmulator);
    if (avd) {
      console.log(`[rydo-mobile] No device running; Capacitor will boot: ${avd.id}`);
      return { id: avd.id, kind: 'emulator', source: 'cap-list' };
    }
  }

  return null;
}

function applyEnvForTarget(target) {
  const envScript = path.join(__dirname, 'use-emulator-env.mjs');
  const platform = target?.kind === 'physical' ? 'android-device' : 'android';
  const args = [envScript, platform];
  if (useDotnet) args.push('--dotnet');
  run('node', args);
}

const target = resolveAndroidTarget();

if (!skipEnv) {
  applyEnvForTarget(target);
}

npm('build');

const androidDir = path.join(mobileRoot, 'android');
if (!fs.existsSync(androidDir)) {
  console.log('\nFirst run: adding Android platform…\n');
  npx(['add', 'android']);
}

npx(['sync', 'android']);

const capRunArgs = ['run', 'android'];
if (target?.id) {
  capRunArgs.push('--target', target.id);
}

console.log('\nLaunching on Android…\n');
npx(capRunArgs);
