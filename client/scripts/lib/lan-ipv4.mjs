import os from 'node:os';

/**
 * Non-loopback IPv4 addresses on this machine (excludes link-local 169.254.x.x).
 */
export function getLanIPv4Addresses() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      const fam = net.family;
      const isV4 = fam === 'IPv4' || fam === 4;
      if (!isV4 || net.internal) continue;
      const a = net.address;
      if (a.startsWith('169.254.')) continue;
      out.push(a);
    }
  }
  return [...new Set(out)];
}
