import express from 'express'
import cors from 'cors'
import { healthRouter } from './modules/health/health.routes.js'
import { cardsRouter } from './modules/cards/cards.routes.js'
import { cardTraderRouter } from './modules/cardtrader/cardtrader.routes.js'

export const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))
app.use(express.json({ limit: '1mb' }))

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#10131c">
  <title>CardVault API</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 20% 0%,#252e48 0,transparent 48%),#10131c;color:#eef2ff;font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}
    main{width:min(100%,620px);padding:clamp(28px,6vw,48px);border:1px solid #30394d;border-radius:24px;background:#171c28eF;box-shadow:0 24px 80px #0005}
    .brand{display:flex;align-items:center;gap:14px;font-weight:750;font-size:22px;letter-spacing:-.5px}.mark{display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#8b5cf6,#4f46e5);font-size:17px}
    .status{display:inline-flex;align-items:center;gap:9px;margin:32px 0 12px;padding:6px 12px;border-radius:999px;background:#123629;color:#9af0c1;font-size:13px;font-weight:700}.dot{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 12px #4ade80}
    h1{font-size:clamp(30px,6vw,42px);line-height:1.15;letter-spacing:-1.4px;margin:8px 0 14px}p{color:#aeb8cc;margin:0 0 24px}.panel{padding:16px 18px;border:1px solid #30394d;border-radius:14px;background:#111621}.panel strong{display:block;font-size:13px;color:#8d9ab3;margin-bottom:5px}.panel a{color:#c4b5fd;text-decoration:none;word-break:break-all}.foot{margin-top:24px;font-size:12px;color:#71809b}
  </style>
</head>
<body><main>
  <div class="brand"><span class="mark">CV</span><span>CardVault <span style="color:#8290aa;font-weight:500">API</span></span></div>
  <div class="status"><span class="dot"></span> Servizio online</div>
  <h1>Backend operativo.<br>Pronto per le carte.</h1>
  <p>Il servizio CardVault risponde correttamente. Qui verranno gestiti inventario, posizioni, prenotazioni e prezzi delle carte.</p>
  <div class="panel"><strong>HEALTH CHECK</strong><a href="/api/health">/api/health</a><div style="color:#9af0c1;font-size:13px;margin-top:6px">Endpoint di stato del servizio</div></div>
  <div class="foot">CardVault · API service · v0.1.0</div>
</main></body></html>`)
})

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'cardvault-api', version: '0.1.0' }))
app.use('/api/health', healthRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/cardtrader', cardTraderRouter)
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
