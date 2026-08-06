import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  define: {
    'import.meta.env.APP_UPDATED_AT': JSON.stringify(new Date().toISOString()),
  },
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon-512.png'],
    manifest: {
      name: 'Cocktail Favorites',
      short_name: 'Cocktails',
      description: 'Your personal cocktail recipe collection',
      theme_color: '#1a1210',
      background_color: '#1a1210',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
  }), cloudflare()],
})