import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon-*.png'],
      // PWABuilder requires sw to be at root scope
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'AutônomoApp',
        short_name: 'Autônomo',
        description: 'Agenda de limpeza de vidros para autônomos',
        theme_color: '#1976D2',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        categories: ['productivity', 'business'],
        // PWABuilder requires at minimum 512 maskable + 192 any
        icons: [
          { src: '/icon-72.png',  sizes: '72x72',   type: 'image/png', purpose: 'any' },
          { src: '/icon-96.png',  sizes: '96x96',   type: 'image/png', purpose: 'any' },
          { src: '/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: '/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: '/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Maskable icon (same file — centered A leaves enough padding)
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [],
      },
    }),
  ],
  base: '/autonomo-app/',
})
