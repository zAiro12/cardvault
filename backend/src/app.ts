import express from 'express'
import cors from 'cors'
import { healthRouter } from './modules/health/health.routes.js'
import { cardsRouter } from './modules/cards/cards.routes.js'
import { cardTraderRouter } from './modules/cardtrader/cardtrader.routes.js'

export const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))
app.use(express.json({ limit: '1mb' }))
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'cardvault-api', version: '0.1.0' }))
app.use('/api/health', healthRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/cardtrader', cardTraderRouter)
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
