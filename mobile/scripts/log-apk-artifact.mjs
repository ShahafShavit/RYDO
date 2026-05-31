#!/usr/bin/env node
/**
 * Print debug APK location with terminal links (and optional file-manager reveal).
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
export const debugApkPath = path.join(
  mobileRoot,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'debug',
  'app-debug.apk',
);

/** OSC 8 hyperlink — clickable in Cursor/VS Code terminal. */
function terminalLink(label, href) {
  return `\u001b]8;;${href}\u001b\\${label}\u001b]8;;\u001b\\`;
}

export function logApkArtifact(filePath = debugApkPath) {
  const abs = path.resolve(filePath);
  const fileName = path.basename(abs);
  const dir = path.dirname(abs);
  const fileUrl = pathToFileURL(abs).href;
  const folderUrl = pathToFileURL(dir).href;
  const sizeMb = (fs.statSync(abs).size / (1024 * 1024)).toFixed(1);

  console.log('\n================================================================');
  console.log('[rydo-mobile] Debug APK ready');
  console.log('================================================================');
  console.log(`  File:   ${terminalLink(fileName, fileUrl)}  (${sizeMb} MB)`);
  console.log(`  Path:   ${abs}`);
  console.log(`  URL:    ${fileUrl}`);
  console.log(`  Folder: ${terminalLink(path.basename(dir), folderUrl)}`);

  if (process.platform === 'win32') {
    console.log(`  Explorer: explorer /select,"${abs}"`);
  } else if (process.platform === 'darwin') {
    console.log(`  Finder:   open -R "${abs}"`);
  } else {
    console.log(`  Files:    xdg-open "${dir}"`);
  }
  console.log('================================================================\n');
}

export function revealApkInFileManager(filePath = debugApkPath) {
  const abs = path.resolve(filePath);
  if (process.platform === 'win32') {
    spawnSync('explorer.exe', [`/select,${abs}`], { shell: true, stdio: 'ignore' });
  } else if (process.platform === 'darwin') {
    spawnSync('open', ['-R', abs], { stdio: 'ignore' });
  } else {
    spawnSync('xdg-open', [path.dirname(abs)], { stdio: 'ignore' });
  }
}

const revealInFileManager = process.argv.includes('--reveal');
const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  if (fs.existsSync(debugApkPath)) {
    logApkArtifact(debugApkPath);
    if (revealInFileManager) revealApkInFileManager(debugApkPath);
  } else {
    console.error(`[rydo-mobile] APK not found at ${debugApkPath}`);
    process.exit(1);
  }
}
