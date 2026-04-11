/**
 * Stops Vite dev server: free the dev port, then kill any remaining Node
 * processes that are clearly running Vite (avoids stray workers / zombies).
 */
import { execFileSync, execSync } from 'node:child_process';

const port = process.env.VITE_DEV_PORT ?? '5173';

function tryRun(file, args) {
  try {
    execFileSync(file, args, { stdio: 'inherit' });
  } catch {
    // Nothing listening / nothing to kill is fine
  }
}

try {
  execSync(`npx --yes kill-port ${port}`, { stdio: 'inherit', shell: true });
} catch {
  // Port already free
}

if (process.platform === 'win32') {
  const script = `
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object {
    $c = $_.CommandLine;
    ($c -like '*\\node_modules\\vite\\*') -or ($c -like '*/node_modules/vite/*')
  } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
`.replace(/\s+/g, ' ').trim();
  tryRun('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script]);
} else {
  tryRun('sh', [
    '-c',
    'pkill -f "[n]ode_modules/.bin/vite" 2>/dev/null; pkill -f "[v]ite/bin/vite.js" 2>/dev/null; true',
  ]);
}
