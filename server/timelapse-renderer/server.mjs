import express from 'express';
import { chromium } from 'playwright';
import {
  readFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const DATA_ROOT = process.env.TIMELAPSE_DATA_ROOT || '/data/timelapse/current';
const GPX_PATH = join(DATA_ROOT, 'track.gpx');
const VISUAL_PATH = join(DATA_ROOT, 'timelapse-visual.json');
const FRAMES_DIR = join(DATA_ROOT, 'frames');
const encoderUrl = (process.env.TIMELAPSE_ENCODER_URL || 'http://timelapse-encoder:8080').replace(
  /\/$/,
  ''
);
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';
/** Extra ms after each seek before screenshot (tiles/camera). Lower = faster, higher = safer. Default 45. */
const FRAME_SETTLE_MS = Math.min(500, Math.max(0, Number(process.env.TIMELAPSE_FRAME_SETTLE_MS) || 45));
/** Vite `root: web` + `build.outDir: dist-web` → `web/dist-web` (not top-level `dist-web`). */
const WEB_ROOT = join(__dirname, 'web', 'dist-web');
/** Enough for e.g. 60 min @ 15fps or 20 min @ 30fps; fps is reduced if needed. */
const MAX_FRAMES = 50000;
const BASE_URL = process.env.RENDERER_PUBLIC_URL || `http://127.0.0.1:${PORT}`;
/** Must be the 3rd arg to `page.waitForFunction` — if passed as 2nd, Playwright treats it as `arg` and keeps the default 30s timeout. */
const MAP_READY_TIMEOUT_MS = Math.min(600_000, Math.max(30_000, Number(process.env.TIMELAPSE_MAP_READY_TIMEOUT_MS) || 120_000));
const DEBUG = process.env.TIMELAPSE_DEBUG === '1' || process.env.TIMELAPSE_DEBUG === 'true';
/** Log capture timing every N frames (1 = every frame). Default 25. */
const CAPTURE_LOG_EVERY = Math.min(
  10_000,
  Math.max(1, Number.parseInt(String(process.env.TIMELAPSE_CAPTURE_LOG_EVERY || '25'), 10) || 25)
);

/** Polled by GET /render/progress while POST /render runs (same Node process). */
let renderProgress = {
  phase: 'idle',
  frame: 0,
  totalFrames: 0,
  fps: 30,
  targetDurationSeconds: 0,
  message: '',
};

const app = express();
app.use(express.json({ limit: '32kb' }));

function injectIndexHtml() {
  let html = readFileSync(join(WEB_ROOT, 'index.html'), 'utf8');
  let visual = {};
  try {
    if (existsSync(VISUAL_PATH)) {
      visual = JSON.parse(readFileSync(VISUAL_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('[timelapse] timelapse-visual.json:', e?.message || e);
  }
  html = html.replace(
    '</head>',
    `<script>window.__RYDO_MAPBOX_TOKEN__=${JSON.stringify(MAPBOX_TOKEN)};window.__RYDO_TIMELAPSE_OPTIONS__=${JSON.stringify(visual)};</script></head>`
  );
  return html;
}

app.get('/', (req, res) => {
  res.type('html').send(injectIndexHtml());
});

app.use(express.static(WEB_ROOT, { index: false }));

app.get('/api/gpx', (req, res) => {
  if (!existsSync(GPX_PATH)) return res.status(404).type('text/plain').send('No GPX');
  res.type('application/gpx+xml').send(readFileSync(GPX_PATH));
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.get('/render/progress', (_, res) => {
  res.json({
    ...renderProgress,
    frameSettleMs: FRAME_SETTLE_MS,
  });
});

app.post('/render', async (req, res) => {
  const targetDuration = Math.min(120, Math.max(30, Number(req.body?.targetDurationSeconds) || 60));
  let fps = Math.min(60, Math.max(12, Number(req.body?.fps) || 30));
  const width = Math.min(2160, Math.max(360, Number(req.body?.width) || 720));
  const height = Math.min(3840, Math.max(640, Number(req.body?.height) || 1280));

  let totalFrames = Math.ceil(targetDuration * fps);
  if (totalFrames > MAX_FRAMES) {
    fps = Math.max(12, Math.floor(MAX_FRAMES / targetDuration));
    totalFrames = Math.ceil(targetDuration * fps);
  }

  if (!MAPBOX_TOKEN) {
    return res.status(500).json({ error: 'MAPBOX_ACCESS_TOKEN is not set' });
  }
  if (!existsSync(GPX_PATH)) {
    return res.status(400).json({ error: 'track.gpx missing on volume' });
  }

  const resetIdle = () => {
    renderProgress = {
      phase: 'idle',
      frame: 0,
      totalFrames: 0,
      fps: 30,
      targetDurationSeconds: 0,
      message: '',
    };
  };

  renderProgress = {
    phase: 'starting',
    frame: 0,
    totalFrames,
    fps,
    targetDurationSeconds: targetDuration,
    message: 'Launching browser',
  };

  mkdirSync(FRAMES_DIR, { recursive: true });
  for (const f of readdirSync(FRAMES_DIR)) {
    unlinkSync(join(FRAMES_DIR, f));
  }

  let browser;
  /** While capturing, suppress Mapbox `[page log]` spam so per-frame lines stay readable (DEBUG only). */
  let mutePageLogWhileCapturing = false;
  try {
    console.log(
      `[timelapse-renderer] render start: ${width}x${height} @ ${fps}fps, ${targetDuration}s, BASE_URL=${BASE_URL}, DATA_ROOT=${DATA_ROOT}`
    );
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        // Mapbox GL needs WebGL; many Linux/headless environments lack a real GPU.
        '--enable-unsafe-swiftshader',
        '--disable-gpu-sandbox',
      ],
    });
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
      const t = msg.type();
      if (DEBUG && mutePageLogWhileCapturing && t === 'log') return;
      const line = `[page ${t}] ${msg.text()}`;
      if (t === 'error' || t === 'warning') console.error(line);
      else if (DEBUG) console.log(line);
    });
    page.on('pageerror', (err) => console.error('[timelapse-renderer] pageerror:', err?.message || err));
    page.on('requestfailed', (req) => {
      if (DEBUG && mutePageLogWhileCapturing) return;
      console.error('[timelapse-renderer] requestfailed:', req.url(), req.failure()?.errorText || '');
    });

    // Mapbox keeps loading vector/terrain tiles — `networkidle` often never fires or flakes in headless CI.
    const navUrl = `${BASE_URL}/`;
    console.log(`[timelapse-renderer] goto ${navUrl} (domcontentloaded)`);
    await page.goto(navUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });

    // Playwright: waitForFunction(pageFunction, arg, options) — options must be 3rd; 2nd is passed into the page function.
    console.log(`[timelapse-renderer] waitForFunction map ready (__rydoMapReady / __rydoMapError), timeout=${MAP_READY_TIMEOUT_MS}ms`);
    await page.waitForFunction(
      () => window.__rydoMapReady === true || window.__rydoMapError,
      undefined,
      { timeout: MAP_READY_TIMEOUT_MS }
    );
    const err = await page.evaluate(() => window.__rydoMapError);
    if (err) {
      await browser.close();
      resetIdle();
      return res.status(400).json({ error: String(err) });
    }

    renderProgress = {
      ...renderProgress,
      phase: 'capturing',
      message: 'Capturing frames',
    };

    mutePageLogWhileCapturing = true;
    const captureT0 = Date.now();
    if (DEBUG) {
      console.log(
        `[timelapse-renderer] capture loop start: ${totalFrames} frames, frameSettleMs=${FRAME_SETTLE_MS}`
      );
    }

    for (let i = 0; i < totalFrames; i++) {
      const seekT = totalFrames <= 1 ? 0 : i / (totalFrames - 1);
      const tSeek0 = Date.now();
      await page.evaluate((tt) => {
        window.__rydoSeek(tt);
      }, seekT);
      await page.waitForTimeout(FRAME_SETTLE_MS);
      const seekSettleMs = Date.now() - tSeek0;

      const file = join(FRAMES_DIR, `frame_${String(i).padStart(5, '0')}.png`);
      const tShot0 = Date.now();
      await page.screenshot({
        path: file,
        type: 'png',
        animations: 'disabled',
      });
      const screenshotMs = Date.now() - tShot0;
      const frameWallMs = Date.now() - tSeek0;

      if (DEBUG) {
        const done = i + 1;
        const elapsed = Date.now() - captureT0;
        const avgMs = elapsed / done;
        const etaSec = ((totalFrames - done) * avgMs) / 1000;
        console.log(
          `[timelapse-renderer] capture frame ${String(done).padStart(5)}/${totalFrames} seek+settle=${seekSettleMs}ms screenshot=${screenshotMs}ms wall=${frameWallMs}ms avg=${avgMs.toFixed(0)}ms eta~${etaSec.toFixed(0)}s`
        );
      }

      renderProgress = {
        ...renderProgress,
        frame: i + 1,
        phase: 'capturing',
        message: `Frame ${i + 1} / ${totalFrames}`,
      };
    }

    const captureTotalMs = Date.now() - captureT0;
    mutePageLogWhileCapturing = false;
    console.log(
      `[timelapse-renderer] capture done: ${totalFrames} frames in ${captureTotalMs}ms (avg ${(captureTotalMs / totalFrames).toFixed(1)}ms/frame)`
    );

    await browser.close();
    browser = null;

    renderProgress = {
      ...renderProgress,
      phase: 'encoding',
      frame: totalFrames,
      message: 'Encoding MP4 (ffmpeg)',
    };

    const encRes = await fetch(`${encoderUrl}/encode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fps }),
    });
    if (!encRes.ok) {
      const t = await encRes.text();
      resetIdle();
      return res.status(502).json({ error: 'Encoder failed', detail: t });
    }

    resetIdle();
    return res.json({ ok: true, frames: totalFrames, fps, targetDurationSeconds: targetDuration });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[timelapse-renderer] render failed:', msg);
    if (browser) {
      try {
        const pages = browser.contexts()?.[0]?.pages?.() || [];
        const p = pages[0];
        if (p) {
          const snap = await p
            .evaluate(() => ({
              ready: window.__rydoMapReady === true,
              err: window.__rydoMapError,
              href: location.href,
            }))
            .catch(() => null);
          if (snap) console.error('[timelapse-renderer] page state at failure:', JSON.stringify(snap));
        }
      } catch (_) {
        /* ignore snapshot errors */
      }
      await browser.close().catch(() => {});
    }
    resetIdle();
    return res.status(500).json({ error: msg });
  }
});

app.listen(PORT, () => {
  console.log(`timelapse-renderer listening on ${PORT}`);
});
