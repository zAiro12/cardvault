import { Router } from 'express'
import { z } from 'zod'

export const cardsRouter = Router()

const cardInput = z.object({
  name: z.string().min(1).max(200),
  game: z.enum(['MAGIC', 'POKEMON', 'YU_GI_OH', 'LORCANA', 'OTHER']),
  setName: z.string().max(200).optional(),
  collectorNumber: z.string().max(40).optional(),
  language: z.string().length(2).default('it'),
  foil: z.boolean().default(false),
})

cardsRouter.get('/', (_req, res) => {
  // TODO: replace sample payload with Prisma query after DB setup.
  res.json({ data: [], message: 'Catalog endpoint scaffold ready' })
})

cardsRouter.post('/', (req, res) => {
  const parsed = cardInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid card payload', details: parsed.error.flatten() })
  // TODO: persist via Prisma. Authentication and ownership guard are required before production.
  return res.status(501).json({ error: 'Persistence not implemented yet', validated: parsed.data })
})