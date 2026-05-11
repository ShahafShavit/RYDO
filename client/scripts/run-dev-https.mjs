/**
 * Starts Vite with HTTPS + --host when .certs/dev.pem exists (see setup-dev-https.mjs).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { getLanIPv4Addresses } from './lib/lan-ipv4.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.join(__dirname, '..');
const certFile = path.join(clientRoot, '.certs', 'dev.pem');
const keyFile = path.join(clientRoot, '.certs', 'dev-key.pem');
const viteBin = path.join(clientRoot, 'node_modules', 'vite', 'bin', 'vite.js');

if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
  console.error('Missing TLS files. Run: npm run setup:dev-https');
  process.exit(1);
}

if (!fs.existsSync(viteBin)) {
  console.error('Vite not found. Run: npm install');
  process.exit(1);
}

const port = process.env.VITE_DEV_PORT ?? '5173';
const lan = getLanIPv4Addresses();

console.info('');
console.info('Vite dev server: HTTPS + LAN binding');
if (lan.length > 0) {
  console.info(`Phone URL: https://${lan[0]}:${port}`);
} else {
  console.info(`Open from another device: https://<this-pc-lan-ip>:${port}`);
}
console.info('Install the mkcert root CA on the phone first — see docs/lan-https-phone.md');
console.info('');

const env = { ...process.env, VITE_DEV_HTTPS: 'true' };
const child = spawn(process.execPath, [viteBin, '--host', '--port', port], {
  cwd: clientRoot,
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
