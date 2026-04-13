import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, __dirname, '');

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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-router')) {
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

          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }

          return undefined;
        },
      },
    },
  },
  };
});
