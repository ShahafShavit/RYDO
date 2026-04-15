import http from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.env.PORT || 8080);
const DATA_ROOT = process.env.TIMELAPSE_DATA_ROOT || '/data/timelapse/current';
const FRAMES_DIR = join(DATA_ROOT, 'frames');
const OUT_DIR = join(DATA_ROOT, 'out');
const OUT_FILE = join(OUT_DIR, 'timelapse.mp4');

function runFfmpeg(fps) {
  return new Promise((resolve, reject) => {
    mkdirSync(OUT_DIR, { recursive: true });
    const inputPattern = join(FRAMES_DIR, 'frame_%05d.png');
    const args = [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-framerate',
      String(fps),
      '-start_number',
      '0',
      '-i',
      inputPattern,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      OUT_FILE,
    ];
    const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    ff.stderr.on('data', (d) => {
      err += d.toString();
    });
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${err}`));
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/encode') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;
  let fps = 30;
  try {
    if (body) fps = Math.min(60, Math.max(12, Number(JSON.parse(body).fps) || 30));
  } catch {
    /* default fps */
  }

  if (!existsSync(FRAMES_DIR)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'frames directory missing' }));
    return;
  }

  try {
    await runFfmpeg(fps);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, out: OUT_FILE }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  }
});

server.listen(PORT, () => {
  console.log(`timelapse-encoder listening on ${PORT}`);
});
