import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * @type {import('vite').UserConfig}
 */
export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => {
            return ['marquee'].includes(tag)
          }
        }
      }
    }),
    VitePWA({
      manifest: {
        name: 'Podrain',
        short_name: 'Podrain',
        start_url: '.',
        theme_color: '#2d3748',
        display: 'standalone',
        icons: [
          {
            src: './podrain-logo-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: './podrain-logo-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
        ]
      }
    })
  ]
}
