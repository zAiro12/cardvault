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
    // Cerca sia il nome Oracle (normalmente inglese) sia le stampe localizzate
    // in italiano. Scryfall restituisce le singole edizioni/stampe.
    const safeQuery = query.replace(/[\\\\:{}()\\[\\]"]/g, ' ').trim()
    const search = async (language?: 'it' | 'en') => {
      const url = new URL('https://api.scryfall.com/cards/search')
      url.searchParams.set('q', `name:"${safeQuery}" game:paper${language ? ` lang:${language}` : ''}`)
      url.searchParams.set('order', 'name')
      url.searchParams.set('unique', 'prints')
      url.searchParams.set('page', '1')
      const response = await fetch(url, { headers: { 'User-Agent': 'CardVault/0.1 (inventory app)', 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) })
      if (!response.ok) {
        if (response.status === 404) return []
        throw new Error(`Scryfall responded ${response.status}`)
      }
      const body = await response.json() as { data?: Array<{ id: string; name: string; set_name: string; set: string; collector_number: string; lang: string; printed_name?: string; foil: boolean; nonfoil: boolean; image_uris?: { small?: string }; prices?: { eur?: string | null; eur_foil?: string | null } }> }
      return body.data ?? []
    }

    const [englishNames, italianNames] = await Promise.all([search('en'), search('it')])
    const normalizedQuery = safeQuery.toLocaleLowerCase()
    const score = (cards: typeof englishNames) => cards.reduce((total, card) => {
      const names = [card.name, card.printed_name].filter((name): name is string => Boolean(name)).map(name => name.toLocaleLowerCase())
      const best = Math.max(0, ...names.map(name => name === normalizedQuery ? 3 : name.startsWith(normalizedQuery) ? 2 : name.includes(normalizedQuery) ? 1 : 0))
      return total + best
    }, 0)
    // Scegli il catalogo linguistico il cui nome corrisponde meglio al testo digitato.
    // In caso di parità favorisci l'italiano, coerente con la lingua predefinita dell'app.
    const matchingNames = score(englishNames) > score(italianNames) ? englishNames : italianNames
    const data = matchingNames.slice(0, 30).map(card => ({
      scryfallId: card.id,
      oracleName: card.name,
      name: card.lang === 'it' && card.printed_name ? card.printed_name : card.name,
      setName: card.set_name,
      setCode: card.set,
      collectorNumber: card.collector_number,
      language: card.lang,
      foil: card.foil && !card.nonfoil,
      imageUrl: card.image_uris?.small ?? null,
      marketPrice: card.prices?.eur ?? card.prices?.eur_foil ?? null,
    }))
    return res.json({ data })
  } catch (error) { return next(error) }
})

cardsRouter.get('/market-price', async (req, res, next) => {
  const scryfallId = typeof req.query.scryfallId === 'string' ? req.query.scryfallId : ''
  const cardName = typeof req.query.cardName === 'string' ? req.query.cardName.trim() : ''
  const setCode = typeof req.query.setCode === 'string' ? req.query.setCode.toLowerCase() : ''
  const language = typeof req.query.language === 'string' ? req.query.language.toLowerCase() : 'it'
  const foil = req.query.foil === 'true'
  const token = process.env.CARDTRADER_API_TOKEN
  if ((!scryfallId && !cardName) || !setCode) return res.status(400).json({ error: 'scryfallId/cardName e setCode sono richiesti.' })
  if (!token) return res.status(503).json({ error: 'CARDTRADER_API_TOKEN non configurato su Vercel.' })

  try {
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    const expansionsResponse = await fetch('https://api.cardtrader.com/api/v2/expansions', { headers, signal: AbortSignal.timeout(12000) })
    if (!expansionsResponse.ok) throw new Error(`CardTrader expansions: ${expansionsResponse.status}`)
    const expansions = await expansionsResponse.json() as Array<{ id: number; game_id: number; code: string; name: string }>
    const expansion = expansions.find(item => item.game_id === 1 && item.code.toLowerCase() === setCode)
    if (!expansion) return res.json({ data: { marketPrice: null, reason: 'Espansione non mappata su CardTrader' } })

    const blueprintsResponse = await fetch(`https://api.cardtrader.com/api/v2/blueprints/export?expansion_id=${expansion.id}`, { headers, signal: AbortSignal.timeout(15000) })
    if (!blueprintsResponse.ok) throw new Error(`CardTrader blueprints: ${blueprintsResponse.status}`)
    const blueprints = await blueprintsResponse.json() as Array<{ id: number; scryfall_id?: string; name?: string; version?: string | null }>
    // First use the exact Scryfall print ID. Some CardTrader catalog blueprints
    // lack this mapping, so fall back to the exact English card name within the
    // already matched expansion; use only an unambiguous match.
    let blueprint = blueprints.find(item => item.scryfall_id === scryfallId)
    if (!blueprint && cardName) {
      const normalize = (value: string) => value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const candidates = blueprints.filter(item => item.name && normalize(item.name) === normalize(cardName))
      if (candidates.length === 1) blueprint = candidates[0]
      else if (candidates.length > 1) return res.json({ data: { marketPrice: null, reason: 'Più stampe CardTrader con lo stesso nome: match non univoco' } })
    }
    if (!blueprint) return res.json({ data: { marketPrice: null, reason: 'Stampa non presente nel catalogo CardTrader (ID Scryfall e nome non associati)' } })

    // CardTrader applica nativamente i filtri lingua e foil sull'endpoint marketplace.
    const params = new URLSearchParams({ blueprint_id: String(blueprint.id), language, foil: String(foil) })
    const marketResponse = await fetch(`https://api.cardtrader.com/api/v2/marketplace/products?${params}`, { headers, signal: AbortSignal.timeout(12000) })
    if (!marketResponse.ok) throw new Error(`CardTrader marketplace: ${marketResponse.status}`)
    const market = await marketResponse.json() as Record<string, Array<{ price?: { cents?: number; currency?: string }; quantity?: number }>>
    const products = market[String(blueprint.id)] ?? []
    // L'endpoint raggruppa le offerte per blueprint e ritorna le più economiche.
    // Usiamo i prezzi EUR validi e disponibili, senza filtrare properties_hash
    // (il filtro lingua/foil è già stato passato nella query).
    const prices = products
      .filter(product => (product.quantity ?? 0) > 0 && product.price?.currency === 'EUR' && typeof product.price.cents === 'number')
      .map(product => product.price!.cents!)
    const cheapest = prices.length ? Math.min(...prices) : null
    return res.json({ data: { marketPrice: cheapest === null ? null : (cheapest / 100).toFixed(2), blueprintId: blueprint.id } })
  } catch (error) { return next(error) }
})

cardsRouter.get('/image', async (req, res, next) => {
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : ''
  const language = req.query.language === 'it' ? 'it' : 'en'
  if (!name) return res.status(400).json({ error: 'Card name is required' })
  try {
    const headers = { 'User-Agent': 'CardVault/0.1 (inventory app)', Accept: 'application/json' }
    type ScryfallCard = { name?: string; printed_name?: string; image_uris?: { normal?: string; large?: string }; card_faces?: Array<{ image_uris?: { normal?: string; large?: string } }> }
    const imageOf = (card: ScryfallCard) => card.image_uris?.normal ?? card.image_uris?.large ?? card.card_faces?.[0]?.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.large ?? null
    // The named endpoint can fail for localized print names. Search the print catalog
    // in the requested language, then fall back to English and match the name.
    for (const lang of [language, language === 'it' ? 'en' : 'it']) {
      const url = new URL('https://api.scryfall.com/cards/search')
      url.searchParams.set('q', `name:"${name.replace(/["\\]/g, ' ')}" lang:${lang} game:paper`)
      url.searchParams.set('unique', 'prints')
      url.searchParams.set('order', 'name')
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
      if (!response.ok) continue
      const body = await response.json() as { data?: ScryfallCard[] }
      const cards = body.data ?? []
      const normalized = (value: string) => value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim()
      const exact = cards.find(card => normalized(card.name || '') === normalized(name) || normalized(card.printed_name || '') === normalized(name))
      const imageUrl = imageOf(exact ?? cards[0] ?? {})
      if (imageUrl) return res.json({ data: { imageUrl } })
    }
    return res.json({ data: { imageUrl: null } })
  } catch (error) { return next(error) }
})

cardsRouter.get('/:id', async (req, res, next) => {
  try {
    const data = await prisma.card.findUnique({ where: { id: req.params.id }, include: { inventory: true, priceHistory: { orderBy: { recordedAt: 'desc' }, take: 10 } } })
    if (!data) return res.status(404).json({ error: 'Card not found' })
    return res.json({ data })
  } catch (error) { return next(error) }
})
