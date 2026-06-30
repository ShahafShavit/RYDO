#!/usr/bin/env node
/**
 * Production mobile build + signed Android App Bundle for Google Play.
 *
 * Prerequisites:
 *   - playstore/rydo-upload.keystore + playstore/keystore.properties
 *   - JDK 21+, ANDROID_HOME, mobile deps installed
 *   - VITE_MAPBOX_ACCESS_TOKEN in client/.env.local (copied by env:prod)
 *
 * Usage (from repo root or playstore/):
 *   node playstore/build-release-aab.mjs
 *   node playstore/build-release-aab.mjs --copy-output
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const playstoreRoot = __dirname;
const repoRoot = path.resolve(playstoreRoot, '..');
const mobileRoot = path.join(repoRoot, 'mobile');
const androidDir = path.join(mobileRoot, 'android');
const keystorePropsPath = path.join(playstoreRoot, 'keystore.properties');
const bundleOutDir = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release');
const bundleAab = path.join(bundleOutDir, 'app-release.aab');
const copyOutput = process.argv.includes('--copy-output');

function fail(msg) {
  console.error(`[playstore] ${msg}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (r.status !== 0) {
    fail(`${cmd} ${args.join(' ')} failed (exit ${r.status ?? 'unknown'})`);
  }
}

function readVersionFromGradle() {
  const gradlePath = path.join(androidDir, 'app', 'build.gradle');
  const text = fs.readFileSync(gradlePath, 'utf8');
  const code = text.match(/versionCode\s+(\d+)/)?.[1] ?? '?';
  const name = text.match(/versionName\s+"([^"]+)"/)?.[1] ?? '?';
  return { code, name };
}

function checkPrereqs() {
  if (!fs.existsSync(keystorePropsPath)) {
    fail(
      'Missing playstore/keystore.properties — copy keystore.properties.example and fill in passwords.'
    );
  }

  const props = Object.fromEntries(
    fs
      .readFileSync(keystorePropsPath, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );

  const storeFile = props.storeFile;
  if (!storeFile) fail('keystore.properties must set storeFile');

  const storePath = path.isAbsolute(storeFile)
    ? storeFile
    : path.join(playstoreRoot, storeFile);
  if (!fs.existsSync(storePath)) {
    fail(`Keystore not found: ${storePath} — run create-keystore.sh or create-keystore.ps1`);
  }

  if (!fs.existsSync(path.join(mobileRoot, 'package.json'))) {
    fail('mobile/ project not found');
  }
  if (!fs.existsSync(androidDir)) {
    fail('mobile/android/ not found — run: cd mobile && npx cap add android');
  }

  const clientEnv = path.join(repoRoot, 'client', '.env.local');
  const mobileEnv = path.join(mobileRoot, '.env.local');
  const envHasMapbox = (filePath) =>
    fs.existsSync(filePath) &&
    /VITE_MAPBOX_ACCESS_TOKEN=\s*\S+/.test(fs.readFileSync(filePath, 'utf8'));
  if (!envHasMapbox(clientEnv) && !envHasMapbox(mobileEnv)) {
    console.warn(
      '[playstore] Warning: VITE_MAPBOX_ACCESS_TOKEN may be missing — set it in client/.env.local before building.'
    );
  }
}

function npm(cmd, args, cwd) {
  run('npm', [cmd, ...args], { cwd });
}

function main() {
  console.log('[playstore] RYDO — release AAB for Google Play\n');
  checkPrereqs();

  if (!fs.existsSync(path.join(mobileRoot, 'node_modules'))) {
    console.log('[playstore] Installing mobile dependencies…');
    run('npm', ['ci', '--no-fund', '--no-audit'], { cwd: mobileRoot });
  }

  console.log('[playstore] Writing production mobile/.env.local (https://rydo.bike)…');
  npm('run', ['env:prod'], mobileRoot);

  console.log('[playstore] Vite production build…');
  npm('run', ['build'], mobileRoot);

  console.log('[playstore] Capacitor sync android…');
  run('npx', ['cap', 'sync', 'android'], { cwd: mobileRoot });

  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  // Stop daemons + clean avoids Windows file-lock errors on incremental release builds.
  console.log('[playstore] Gradle --stop (release stale daemons)…');
  run(gradlew, ['--stop'], { cwd: androidDir });
  console.log('[playstore] Gradle clean bundleRelease…');
  run(gradlew, ['clean', 'bundleRelease'], { cwd: androidDir });

  if (!fs.existsSync(bundleAab)) {
    fail(`AAB not found at ${bundleAab}`);
  }

  const { code, name } = readVersionFromGradle();
  const sizeMb = (fs.statSync(bundleAab).size / (1024 * 1024)).toFixed(1);

  console.log('\n[playstore] Success');
  console.log(`  Package:     dev.rydo.app`);
  console.log(`  Version:     ${name} (${code})`);
  console.log(`  AAB:         ${bundleAab}`);
  console.log(`  Size:        ${sizeMb} MB`);
  console.log('\nUpload this file in Play Console → Release → Testing (or Production).');

  if (copyOutput) {
    const outDir = path.join(playstoreRoot, 'output');
    fs.mkdirSync(outDir, { recursive: true });
    const dest = path.join(outDir, `rydo-${name}-${code}.aab`);
    fs.copyFileSync(bundleAab, dest);
    console.log(`  Copied to:   ${dest}`);
  }
}

main();
