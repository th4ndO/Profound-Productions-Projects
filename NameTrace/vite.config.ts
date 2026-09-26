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

export default defineConfig(({ command }) => {
  // A NODE_ENV=development left in the shell makes Vite bundle React's
  // development build (larger and much slower). Builds are always production.
  if (command === 'build') process.env.NODE_ENV = 'production';
  return {
    plugins: [react(), tailwindcss(), devCsp()],
    worker: { format: 'es' as const },
    build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  };
});
