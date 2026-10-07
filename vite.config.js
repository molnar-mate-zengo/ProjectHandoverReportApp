import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// base './' + hash routing: works under any GitHub Pages path.
// /infodomain: dev-only proxy for the domain expiry lookup (production uses proxy/whois.gs).
export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: { '/infodomain': { target: 'https://info.domain.hu', changeOrigin: true, rewrite: p => p.replace(/^\/infodomain/, '') } },
  },
})
