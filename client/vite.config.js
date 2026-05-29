import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, __dirname, '');
  /** Matches Docker Compose API publish (`localhost:5000`). For `dotnet run` only (port 5032), set VITE_DEV_PROXY_TARGET in .env.local. */
  const devProxyTarget = (env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:5000').replace(/\/$/, '');

  const devHttps = process.env.VITE_DEV_HTTPS === 'true' || process.env.VITE_DEV_HTTPS === '1';
  let https;
  if (devHttps) {
    const certFile = path.join(__dirname, '.certs', 'dev.pem');
    const keyFile = path.join(__dirname, '.certs', 'dev-key.pem');
    if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
      throw new Error(
        'VITE_DEV_HTTPS is set but client/.certs/dev.pem or dev-key.pem is missing. Run: npm run setup:dev-https',
      );
    }
    https = {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    };
  }

  const devProxy =
    command === 'serve'
      ? {
          '/api': { target: devProxyTarget, changeOrigin: true, secure: false },
          '/hubs': { target: devProxyTarget, changeOrigin: true, ws: true, secure: false },
          '/health': { target: devProxyTarget, changeOrigin: true, secure: false },
        }
      : undefined;

  const server =
    command === 'serve'
      ? {
          ...(devHttps && https ? { https, host: true } : {}),
          ...(devProxy ? { proxy: devProxy } : {}),
        }
      : undefined;

  return {
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'html-site-origin',
      transformIndexHtml: {
        handler(html, ctx) {
          const fromEnv = (env.VITE_SITE_ORIGIN || '').replace(/\/$/, '');
          if (fromEnv) {
            return html.replaceAll('%SITE_ORIGIN%', fromEnv);
          }
          // Dev: match the Vite dev server URL (port/host from config).
          if (command === 'serve') {
            if (ctx.server) {
              const { host: rawHost, port: rawPort, https } = ctx.server.config.server;
              const port = rawPort ?? 5173;
              const host =
                rawHost === true || rawHost === '0.0.0.0' || rawHost === '::'
                  ? 'localhost'
                  : (rawHost || 'localhost');
              const protocol = https ? 'https' : 'http';
              return html.replaceAll('%SITE_ORIGIN%', `${protocol}://${host}:${port}`);
            }
            return html.replaceAll('%SITE_ORIGIN%', 'http://localhost:5173');
          }
          // Production build: keep placeholder for Kestrel (or another host) to inject at serve time.
          return html;
        },
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router') ||
            id.includes('framer-motion')
          ) {
            return 'vendor-react';
          }

          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }

          if (
            id.includes('leaflet') ||
            id.includes('togeojson') ||
            id.includes('mapbox-gl') ||
            id.includes('react-map-gl') ||
            id.includes('@vis.gl/react-mapbox') ||
            id.includes('@turf/')
          ) {
            return 'vendor-maps';
          }

          if (id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'vendor-ui';
          }

          return undefined;
        },
      },
    },
  },
  };
});
