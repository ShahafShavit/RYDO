import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, '../client');
const clientSrc = path.resolve(clientRoot, 'src');
const mobileEntry = path.resolve(__dirname, 'src/main.jsx');

/** Client src lives outside mobile/; resolve its npm imports from mobile/node_modules. */
function resolveFromMobileNodeModules() {
  return {
    name: 'resolve-from-mobile-node-modules',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer) return null;
      const importerNorm = importer.replace(/\\/g, '/');
      if (!importerNorm.includes('/client/')) return null;
      if (source.startsWith('.') || source.startsWith('\0') || source.startsWith('/') || source.startsWith('@/')) {
        return null;
      }
      return this.resolve(source, mobileEntry, { skipSelf: true, ...options });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  return {
    base: './',
    root: __dirname,
    envDir: __dirname,
    publicDir: path.resolve(clientRoot, 'public'),
    plugins: [
      resolveFromMobileNodeModules(),
      react(),
      tailwindcss(),
      {
        name: 'html-site-origin-mobile',
        transformIndexHtml(html) {
          const origin = (env.VITE_SITE_ORIGIN || 'capacitor://localhost').replace(/\/$/, '');
          return html.replaceAll('%SITE_ORIGIN%', origin);
        },
      },
    ],
    resolve: {
      alias: {
        '@': clientSrc,
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
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
