import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';

// The CSP in index.html blocks inline scripts and websockets, which the dev
// server needs for React Fast Refresh and HMR. Strip it only when serving.
function devCsp(): Plugin {
  return {
    name: 'nametrace-dev-csp',
    apply: 'serve',
    transformIndexHtml: (html) => html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>\n?/, ''),
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devCsp()],
  worker: { format: 'es' },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
