import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({ 
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: false,
      workbox: {
        navigateFallbackDenylist: [/^\/admin/]
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        admin: './admin.html'
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase/')) {
            return 'firebase-vendor';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'lucide-icons';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
