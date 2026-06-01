#!/usr/bin/env node
/**
 * Prints iOS/Capacitor prerequisite hints before `npm run run:ios:device`.
 * macOS + Xcode only.
 */
import { spawnSync } from 'child_process';

const issues = [];
const hints = [];

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8', shell: false });
}

function checkPlatform() {
  if (process.platform !== 'darwin') {
    issues.push('iOS builds require macOS with Xcode (not available on Windows/Linux).');
    hints.push('Use a Mac, or test on Android with: npm run run:android');
  }
}

function checkXcode() {
  const xcodeSelect = run('xcode-select', ['-p']);
  if (xcodeSelect.status !== 0 || !xcodeSelect.stdout?.trim()) {
    issues.push('Xcode Command Line Tools are not installed.');
    hints.push('Run: xcode-select --install');
    hints.push('Then install Xcode from the App Store and open it once.');
    return;
  }

  const version = run('xcodebuild', ['-version']);
  if (version.status !== 0) {
    issues.push('xcodebuild is not available.');
    hints.push('Install Xcode from the App Store, then run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer');
    return;
  }

  const firstLine = (version.stdout || '').split(/\r?\n/)[0]?.trim();
  if (firstLine) console.log(firstLine);
}

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) {
    issues.push(`Node.js ${process.versions.node} — Capacitor 7 CLI needs Node 20+.`);
    hints.push('Upgrade Node (nvm, fnm, or brew install node).');
  }
}

function listConnectedDevices() {
  const listed = run('npx', ['cap', 'run', 'ios', '--list']);
  if (listed.status !== 0) {
    hints.push('Could not list iOS targets yet — run npm install in mobile/ and npx cap add ios on first use.');
    return;
  }

  const physical = parseCapIosTargets(listed.stdout).filter((t) => t.kind === 'device');
  if (physical.length === 0) {
    hints.push(
      'No USB iPhone detected. Connect via USB, unlock the phone, tap Trust, and enable Settings → Privacy & Security → Developer Mode (iOS 16+).',
    );
  } else {
    console.log(`USB iPhone(s): ${physical.map((d) => d.name || d.id).join(', ')}`);
  }
}

/** @param {string | undefined} stdout */
export function parseCapIosTargets(stdout) {
  if (!stdout) return [];
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^Name\s+/i.test(line) && !/^-+$/.test(line))
    .map((line) => {
      const isSimulator = /\(simulator\)/i.test(line);
      const isDevice = /\(device\)/i.test(line) || (!isSimulator && /\([0-9a-f-]{8,}\)/i.test(line));
      const parts = line.split(/\s{2,}/).filter(Boolean);
      const id = parts[parts.length - 1]?.trim() ?? '';
      const name = parts[0]?.trim() ?? id;
      return {
        id,
        name,
        kind: isSimulator ? 'simulator' : isDevice ? 'device' : 'unknown',
      };
    })
    .filter((t) => t.id);
}

checkPlatform();
checkNode();

console.log('\n--- RYDO iOS prerequisites ---\n');

if (process.platform === 'darwin') {
  checkXcode();
}

if (issues.length) {
  console.log('\nIssues:');
  issues.forEach((i) => console.log(`  ✗ ${i}`));
  console.log('\nHints:');
  hints.forEach((h) => console.log(`  ${h}`));
  console.log('\nDocs: mobile/README.md → "Run on a physical iPhone (USB)"\n');
  process.exit(1);
}

if (process.platform === 'darwin') {
  listConnectedDevices();
}

if (hints.length) {
  console.log('\nHints:');
  hints.forEach((h) => console.log(`  ${h}`));
}

console.log('\nOK — try: npm run run:ios:device\n');
