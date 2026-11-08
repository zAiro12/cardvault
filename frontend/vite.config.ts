import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const buildDate = new Date()
const pad = (value: number) => String(value).padStart(2, '0')
const buildVersion = `${buildDate.getUTCFullYear()}.${pad(buildDate.getUTCMonth() + 1)}.${pad(buildDate.getUTCDate())}-${pad(buildDate.getUTCHours())}${pad(buildDate.getUTCMinutes())}`

export default defineConfig({
  plugins: [vue()],
  define: { __BUILD_VERSION__: JSON.stringify(buildVersion) },
  base: '/cardvault/',
  server: { port: 5173 },
})