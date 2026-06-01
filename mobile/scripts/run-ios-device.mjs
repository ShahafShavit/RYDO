#!/usr/bin/env node
/**
 * Build web assets, sync Capacitor iOS, install and launch on a USB-connected iPhone.
 * Uses production API (https://rydo.bike) unless --skip-env.
 *
 * macOS + Xcode only.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCapIosTargets } from './check-ios-prereqs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const skipEnv = process.argv.includes('--skip-env');
const openXcode = process.argv.includes('--open');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: mobileRoot,
    shell: false,
    env: { ...process.env },
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runCapture(cmd, args) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    cwd: mobileRoot,
    shell: false,
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

function applyProdEnv() {
  run('node', [path.join(__dirname, 'use-emulator-env.mjs'), 'prod']);
}

/** Prefer USB iPhone over simulators. */
function resolveIosTarget() {
  const explicit = readArgValue('--target');
  if (explicit) {
    return { id: explicit, kind: 'explicit', source: 'explicit' };
  }

  const listed = runCapture('npx', ['cap', 'run', 'ios', '--list']);
  if (listed.ok) {
    const targets = parseCapIosTargets(listed.stdout);
    const devices = targets.filter((t) => t.kind === 'device');
    if (devices.length === 1) {
      console.log(`[rydo-mobile] Using USB iPhone: ${devices[0].name || devices[0].id}`);
      return { ...devices[0], source: 'cap-list' };
    }
    if (devices.length > 1) {
      console.log(`[rydo-mobile] Multiple USB iPhones: ${devices.map((d) => d.name || d.id).join(', ')}`);
      console.log('[rydo-mobile] Pass --target <id> to pick one');
      return { ...devices[0], source: 'cap-list' };
    }
  }

  return null;
}

function printDeviceHelp() {
  console.error(`
No USB iPhone found.

  1. Connect iPhone via USB and unlock it
  2. Tap Trust on the phone when prompted
  3. iOS 16+: Settings → Privacy & Security → Developer Mode → On (reboot if asked)
  4. In Xcode (first time): open ios/App/App.xcworkspace → Signing & Capabilities → select your Team

List targets:  npx cap run ios --list
Pick one:      npm run run:ios:device -- --target <id>
`);
}

if (process.platform !== 'darwin') {
  console.error('[rydo-mobile] iOS device deploy requires macOS with Xcode.');
  process.exit(1);
}

if (!skipEnv) {
  applyProdEnv();
} else {
  console.log('[rydo-mobile] --skip-env: keeping existing mobile/.env.local');
}

npm('build');

const iosDir = path.join(mobileRoot, 'ios');
if (!fs.existsSync(iosDir)) {
  console.log('\nFirst run: adding iOS platform…\n');
  npx(['add', 'ios']);
}

npx(['sync', 'ios']);

const target = resolveIosTarget();
if (!target?.id && !openXcode) {
  printDeviceHelp();
  process.exit(1);
}

if (openXcode) {
  console.log('\nOpening Xcode — select your iPhone and press Run (⌘R).\n');
  npx(['open', 'ios']);
  process.exit(0);
}

const capRunArgs = ['run', 'ios', '--target', target.id];

console.log('\nBuilding and installing on iPhone (debug)…\n');
console.log('[rydo-mobile] Debug JS: Safari → Develop → <your iPhone> → RYDO\n');

const capRun = spawnSync('npx', ['cap', ...capRunArgs], {
  stdio: 'inherit',
  cwd: mobileRoot,
  shell: false,
  env: { ...process.env },
});

if (capRun.status !== 0) {
  console.error(`
If signing failed, open Xcode once and set your Team:
  npm run run:ios:device -- --open

Or: npm run cap:open:ios → App target → Signing & Capabilities
`);
  process.exit(capRun.status ?? 1);
}
