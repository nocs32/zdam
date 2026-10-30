import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  // In development the sync server runs separately: npm run server (see README).
  server: { proxy: { '/api': 'http://localhost:3000' } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Здам — підготовка до іспиту з ПДР',
        short_name: 'Здам',
        lang: 'uk',
        start_url: './',
        display: 'standalone',
        background_color: '#E8ECF0',
        theme_color: '#0A4DA2',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything, including all question images, is cached on first visit so the app works offline.
        globPatterns: ['**/*.{js,css,html,woff2,png,webp,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Sync always goes to the network.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
})
