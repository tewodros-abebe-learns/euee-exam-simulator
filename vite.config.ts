import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, type Plugin } from 'vite';

/**
 * Stamps public/sw.js with a per-build cache name so that a new deployment
 * always invalidates the previous PWA cache instead of serving stale shells.
 */
function serviceWorkerVersion(): Plugin {
  return {
    name: 'service-worker-version',
    apply: 'build',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (!fs.existsSync(swPath)) return;
      const version = `${Date.now()}`;
      const source = fs.readFileSync(swPath, 'utf8');
      fs.writeFileSync(swPath, source.replace(/__BUILD_VERSION__/g, version));
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), serviceWorkerVersion()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    host: '0.0.0.0',
    // Allow the Arena/sandbox preview host (and any tunnel) to reach the dev
    // server; without this Vite answers 403 "Blocked request" for the preview.
    allowedHosts: true,
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    hmr: process.env.DISABLE_HMR !== 'true',
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    // The exam bank is large by design; keep the warning threshold realistic.
    chunkSizeWarningLimit: 3000,
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing vendors so a code change does not
        // force students on slow connections to re-download ~2 MB.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          if (id.includes('pdfjs-dist')) return 'vendor-pdf';
          if (id.includes('katex') || id.includes('rehype') || id.includes('remark') || id.includes('react-markdown')) return 'vendor-markdown';
          if (id.includes('motion') || id.includes('framer')) return 'vendor-motion';
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
}));
