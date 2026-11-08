import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const buildDate = new Date()
const italianTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}).formatToParts(buildDate)
const part = (type: string) => italianTime.find((item) => item.type === type)?.value ?? '00'
const buildVersion = `v. ${part('year')}.${part('month')}.${part('day')}-${part('hour')}${part('minute')}`

export default defineConfig({
  plugins: [vue()],
  define: { __BUILD_VERSION__: JSON.stringify(buildVersion) },
  base: '/cardvault/',
  server: { port: 5173 },
})