import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/autonomo-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon-*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'AutônomoApp',
        short_name: 'Autônomo',
        description: 'Organize sua agenda de clientes, acompanhe pagamentos e gere relatórios mensais. Funciona offline, instala direto no celular e não exige cadastro. Feito para autônomos que trabalham sozinhos.',
        theme_color: '#1976D2',
        background_color: '#060606',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/autonomo-app/',
        scope: '/autonomo-app/',
        lang: 'pt-BR',
        categories: ['productivity', 'business'],
        icons: [
          { src: 'icon-72.png',  sizes: '72x72',   type: 'image/png', purpose: 'any' },
          { src: 'icon-96.png',  sizes: '96x96',   type: 'image/png', purpose: 'any' },
          { src: 'icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: 'icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: 'icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [],
      },
    }),
  ],
})
