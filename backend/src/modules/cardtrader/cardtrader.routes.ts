import { Router } from 'express'
export const cardTraderRouter = Router()

cardTraderRouter.get('/status', (_req, res) => {
  res.json({ configured: Boolean(process.env.CARDTRADER_API_TOKEN), integration: 'CardTrader API v2', syncEnabled: false })
})

// TODO: Add exact marketplace/blueprint endpoints after confirming account permissions.
// Keep calls server-side; never send the API token to the browser.