#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localPath = path.join(mobileRoot, '.env.local');

if (!fs.existsSync(localPath)) {
  console.error(`
mobile/.env.local is missing.

Run one of:
  npm run env:android    (Android emulator + Docker API :5000)
  npm run env:ios        (iOS simulator + Docker API :5000)
  npm run env:android:dotnet
`);
  process.exit(1);
}

const text = fs.readFileSync(localPath, 'utf8');
if (!/VITE_API_BASE_URL=\s*\S+/.test(text)) {
  console.error('mobile/.env.local has no VITE_API_BASE_URL. Re-run npm run env:android');
  process.exit(1);
}
