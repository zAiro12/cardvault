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


cardsRouter.get('/autocomplete', async (req, res, next) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const game = typeof req.query.game === 'string' ? req.query.game : 'MAGIC'
  if (query.length < 2) return res.json({ data: [] })
  if (game !== 'MAGIC') return res.status(501).json({ error: 'Autocompletamento catalogo disponibile al momento per Magic: The Gathering.' })
  try {
    const url = new URL('https://api.scryfall.com/cards/search')
    url.searchParams.set('q', `name:${query.replace(/[\\\\:{}()\\[\\]"]/g, ' ').trim()} game:paper`)
    url.searchParams.set('order', 'name')
    url.searchParams.set('unique', 'prints')
    url.searchParams.set('page', '1')
    const response = await fetch(url, { headers: { 'User-Agent': 'CardVault/0.1 (inventory app)', 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) })
    if (!response.ok) {
      if (response.status === 404) return res.json({ data: [] })
      throw new Error(`Scryfall responded ${response.status}`)
    }
    const body = await response.json() as { data?: Array<{ id: string; name: string; set_name: string; set: string; collector_number: string; lang: string; foil: boolean; nonfoil: boolean; image_uris?: { small?: string }; prices?: { eur?: string | null; eur_foil?: string | null } }> }
    const data = (body.data ?? []).slice(0, 20).map(card => ({ scryfallId: card.id, name: card.name, setName: card.set_name, setCode: card.set, collectorNumber: card.collector_number, language: card.lang, foil: card.foil && !card.nonfoil, imageUrl: card.image_uris?.small ?? null, marketPrice: card.prices?.eur ?? card.prices?.eur_foil ?? null }))
    return res.json({ data })
  } catch (error) { return next(error) }
})

cardsRouter.get('/:id', async (req, res, next) => {
  try {
    const data = await prisma.card.findUnique({ where: { id: req.params.id }, include: { inventory: true, priceHistory: { orderBy: { recordedAt: 'desc' }, take: 10 } } })
    if (!data) return res.status(404).json({ error: 'Card not found' })
    return res.json({ data })
  } catch (error) { return next(error) }
})
