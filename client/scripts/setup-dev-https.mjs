/**
 * Generates mkcert TLS material for local Vite HTTPS so phones on the same LAN
 * can load the dev app in a secure context (Geolocation, etc.).
 *
 * Prerequisites: mkcert installed and `mkcert -install` run once on this machine.
 * https://github.com/FiloSottile/mkcert
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLanIPv4Addresses } from './lib/lan-ipv4.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.join(__dirname, '..');
const certsDir = path.join(clientRoot, '.certs');
const certFile = path.join(certsDir, 'dev.pem');
const keyFile = path.join(certsDir, 'dev-key.pem');

function tryMkcert(args) {
  try {
    execFileSync('mkcert', args, { stdio: 'inherit', cwd: clientRoot });
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!tryMkcert(['-version'])) {
    console.error(
      [
        'mkcert was not found in PATH.',
        'Install it, then run `mkcert -install` once (may require admin / sudo):',
        '  https://github.com/FiloSottile/mkcert#installation',
      ].join('\n'),
    );
    process.exit(1);
  }

  fs.mkdirSync(certsDir, { recursive: true });

  const lan = getLanIPv4Addresses();
  const names = ['localhost', '127.0.0.1', '::1', ...lan];

  const ok = tryMkcert(['-cert-file', certFile, '-key-file', keyFile, ...names]);
  if (!ok) {
    process.exit(1);
  }

  let caroot = '';
  try {
    caroot = execFileSync('mkcert', ['-CAROOT'], { encoding: 'utf8' }).trim();
  } catch {
    caroot = '(run `mkcert -CAROOT` to print the folder)';
  }

  console.info('');
  console.info('Created:', certFile);
  console.info('Created:', keyFile);
  console.info('SANs:', names.join(', '));
  console.info('');
  console.info('mkcert root CA folder (install rootCA.pem on your phone — see docs/lan-https-phone.md):');
  console.info(' ', caroot);
  console.info('');
  console.info('Next: npm run dev:lan');
  if (lan.length > 0) {
    console.info(`Then on your phone (same Wi‑Fi): https://${lan[0]}:5173`);
  } else {
    console.info('No LAN IPv4 found — connect Wi‑Fi/Ethernet, re-run this script, then open https://<your-ip>:5173');
  }
  console.info('');
}

main();
