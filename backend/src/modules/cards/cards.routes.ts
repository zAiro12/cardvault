import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

export const cardsRouter = Router()

const cardInput = z.object({
  name: z.string().trim().min(1).max(200),
  game: z.enum(['MAGIC', 'POKEMON', 'YU_GI_OH', 'LORCANA', 'OTHER']),
  setName: z.string().max(200).optional(),
  collectorNumber: z.string().max(40).optional(),
  language: z.string().length(2).default('it'),
  foil: z.boolean().default(false),
  variant: z.string().max(100).optional(),
  cardTraderBlueprintId: z.string().max(100).optional(),
})

cardsRouter.get('/', async (_req, res, next) => {
  try {
    const data = await prisma.card.findMany({ orderBy: [{ game: 'asc' }, { name: 'asc' }] })
    res.json({ data })
  } catch (error) { next(error) }
})

cardsRouter.post('/', async (req, res, next) => {
  const parsed = cardInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid card payload', details: parsed.error.flatten() })
  try {
    const card = await prisma.card.create({ data: parsed.data })
    return res.status(201).json({ data: card })
  } catch (error) { return next(error) }
})

cardsRouter.get('/:id', async (req, res, next) => {
  try {
    const data = await prisma.card.findUnique({ where: { id: req.params.id }, include: { inventory: true, priceHistory: { orderBy: { recordedAt: 'desc' }, take: 10 } } })
    if (!data) return res.status(404).json({ error: 'Card not found' })
    return res.json({ data })
  } catch (error) { return next(error) }
})
