import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'MRU Heroes: Misión Crítica',
          short_name: 'MRU Heroes',
          description: 'Aprende física jugando carreras espaciales con MRU.',
          theme_color: '#0072ce',
          background_color: '#e0f2fe',
          display: 'standalone',
          icons: [
            {
              src: 'https://i.postimg.cc/cHsJqfy5/Vector2.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://i.postimg.cc/cHsJqfy5/Vector2.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
