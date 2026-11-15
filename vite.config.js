import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { invitationResendDev } from './scripts/invitation-resend-dev.js';

function cleanUrlPlugin() {
  return {
    name: 'clean-urls',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url.split('?')[0];
        if (url !== '/' && !url.includes('.')) {
          const htmlPath = resolve(__dirname, 'public' + url + '.html');
          if (fs.existsSync(htmlPath)) {
            req.url = url + '.html';
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: '.',
  base: '/',

  plugins: [cleanUrlPlugin(), invitationResendDev()],

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/bp.[name].[hash].js',
        chunkFileNames: 'assets/bp.[name].[hash].js',
        assetFileNames: 'assets/bp.[name].[hash][extname]',

        manualChunks: {
          'core':     [
            './src/core/constants.js',
            './src/core/security.js',
            './src/core/utils.js',
            './src/core/analytics.js',
          ],
          'firebase': ['./src/core/firebase.js'],
          'engines':  [
            './src/engine/skill-library.js',
            './src/engine/bls.js',
            './src/engine/crosswalk.js',
            './src/engine/values.js',
            './src/engine/evidence.js',
            './src/engine/verification.js',
            './src/engine/match.js',
            './src/engine/job-analysis.js',
          ],
          'admin':    [
            './src/admin/index.js',
            './src/admin/overview.js',
            './src/admin/users.js',
            './src/admin/costs.js',
            './src/admin/roadmap.js',
            './src/admin/architecture.js',
          ],
          'wb':       [
            './src/features/wb-wizard.js',
            './src/features/wb-compare.js',
          ],
          'scouting': ['./src/features/scouting.js'],
          'views':    [
            './src/views/welcome.js',
            './src/views/network.js',
            './src/views/jobs.js',
            './src/views/blueprint.js',
            './src/views/reports.js',
            './src/views/settings.js',
            './src/views/user-data.js',
          ],
        },
      },
    },

    assetsInlineLimit: 0,
    sourcemap: true,
    target: 'es2020',
  },

  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    open: false,
  },
});
