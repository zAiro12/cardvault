import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

export const inventoryRouter = Router()
const ownerEmail = process.env.CARDVAULT_OWNER_EMAIL ?? 'owner@cardvault.local'

async function owner() {
  return prisma.user.upsert({ where: { email: ownerEmail }, update: {}, create: { email: ownerEmail } })
}

const createInput = z.object({
  cardId: z.string().uuid(),
  quantity: z.number().int().positive().max(100000),
  condition: z.string().trim().min(1).max(20).default('NM'),
  purchasePrice: z.number().nonnegative().optional(),
  marketPrice: z.number().nonnegative().optional(),
  location: z.string().trim().max(200).optional(),
  notes: z.string().max(2000).optional(),
})

inventoryRouter.get('/', async (_req, res, next) => {
  try {
    const user = await owner()
    const data = await prisma.inventoryItem.findMany({
      where: { userId: user.id },
      include: { card: true, location: true, reservations: { where: { status: { in: ['RESERVED', 'CONFIRMED'] } } } },
      orderBy: { updatedAt: 'desc' },
    })
    res.json({ data })
  } catch (error) { next(error) }
})

inventoryRouter.post('/', async (req, res, next) => {
  const parsed = createInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid inventory payload', details: parsed.error.flatten() })
  try {
    const user = await owner()
    const { location, ...values } = parsed.data
    let locationId: string | undefined
    if (location) {
      const existing = await prisma.location.findFirst({ where: { userId: user.id, name: location, parentId: null } })
      const savedLocation = existing ?? await prisma.location.create({ data: { userId: user.id, name: location, type: 'STORAGE' } })
      locationId = savedLocation.id
    }
    const item = await prisma.inventoryItem.create({
      data: { ...values, purchasePrice: values.purchasePrice, marketPrice: values.marketPrice, userId: user.id, locationId,
        movements: { create: { quantityDelta: values.quantity, type: 'IN', note: 'Initial stock entry' } } },
      include: { card: true, location: true, reservations: true },
    })
    return res.status(201).json({ data: item })
  } catch (error) { return next(error) }
})

const updateInput = z.object({
  quantity: z.number().int().nonnegative().max(100000).optional(),
  condition: z.string().trim().min(1).max(20).optional(),
  purchasePrice: z.number().nonnegative().nullable().optional(),
  marketPrice: z.number().nonnegative().nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
}).refine(value => Object.keys(value).length > 0, 'At least one field is required')

inventoryRouter.patch('/:id', async (req, res, next) => {
  const parsed = updateInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid update payload', details: parsed.error.flatten() })
  try {
    const user = await owner()
    const current = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, userId: user.id } })
    if (!current) return res.status(404).json({ error: 'Inventory item not found' })
    const { location, quantity, ...fields } = parsed.data
    let locationId: string | null | undefined
    if (location !== undefined) {
      if (location === null || location.trim() === '') locationId = null
      else {
        const existing = await prisma.location.findFirst({ where: { userId: user.id, name: location, parentId: null } })
        locationId = (existing ?? await prisma.location.create({ data: { userId: user.id, name: location, type: 'STORAGE' } })).id
      }
    }
    const delta = quantity === undefined ? 0 : quantity - current.quantity
    if (quantity !== undefined) {
      const activeReservations = await prisma.reservation.findMany({ where: { inventoryItemId: current.id, status: { in: ['RESERVED', 'CONFIRMED'] } } })
      const reservedQuantity = activeReservations.reduce((sum, reservation) => sum + reservation.quantity, 0)
      if (quantity < reservedQuantity) return res.status(409).json({ error: `Quantity cannot be lower than active reservations (${reservedQuantity} copies)` })
    }
    const item = await prisma.$transaction(async tx => {
      const updated = await tx.inventoryItem.update({ where: { id: current.id }, data: { ...fields, ...(quantity !== undefined ? { quantity } : {}), ...(locationId !== undefined ? { locationId } : {}) }, include: { card: true, location: true, reservations: true } })
      if (delta !== 0) await tx.inventoryMovement.create({ data: { inventoryItemId: current.id, quantityDelta: delta, type: delta > 0 ? 'IN' : 'OUT', note: 'Stock quantity updated' } })
      return updated
    })
    return res.json({ data: item })
  } catch (error) { return next(error) }
})

inventoryRouter.delete('/:id', async (req, res, next) => {
  try {
    const user = await owner()
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, userId: user.id } })
    if (!item) return res.status(404).json({ error: 'Inventory item not found' })
    const activeReservations = await prisma.reservation.count({ where: { inventoryItemId: item.id, status: { in: ['RESERVED', 'CONFIRMED'] } } })
    if (activeReservations > 0) return res.status(409).json({ error: 'Impossibile eliminare: ci sono prenotazioni attive. Annullale o registrale come vendute prima.' })
    await prisma.inventoryItem.delete({ where: { id: item.id } })
    return res.status(204).send()
  } catch (error) { return next(error) }
})

const reservationInput = z.object({ customer: z.string().trim().min(1).max(200), quantity: z.number().int().positive() })
inventoryRouter.post('/:id/reservations', async (req, res, next) => {
  const parsed = reservationInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid reservation payload', details: parsed.error.flatten() })
  try {
    const user = await owner()
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, userId: user.id }, include: { reservations: { where: { status: { in: ['RESERVED', 'CONFIRMED'] } } } } })
    if (!item) return res.status(404).json({ error: 'Inventory item not found' })
    const reserved = item.reservations.reduce((sum, reservation) => sum + reservation.quantity, 0)
    if (parsed.data.quantity > item.quantity - reserved) return res.status(409).json({ error: 'Not enough available quantity', available: item.quantity - reserved })
    const reservation = await prisma.reservation.create({ data: { inventoryItemId: item.id, ...parsed.data } })
    return res.status(201).json({ data: reservation })
  } catch (error) { return next(error) }
})

inventoryRouter.patch('/:id/reservations/:reservationId', async (req, res, next) => {
  const statusInput = z.object({ status: z.enum(['RESERVED', 'CONFIRMED', 'SOLD', 'CANCELLED']) }).safeParse(req.body)
  if (!statusInput.success) return res.status(400).json({ error: 'Invalid reservation status' })
  try {
    const user = await owner()
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, userId: user.id } })
    if (!item) return res.status(404).json({ error: 'Inventory item not found' })
    const reservation = await prisma.reservation.findFirst({ where: { id: req.params.reservationId, inventoryItemId: item.id } })
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' })
    if (reservation.status === 'SOLD' || reservation.status === 'CANCELLED') return res.status(409).json({ error: 'Reservation is already closed' })
    const target = statusInput.data.status
    if (target === 'SOLD') {
      const updated = await prisma.$transaction(async tx => {
        const current = await tx.inventoryItem.findUnique({ where: { id: item.id } })
        if (!current || current.quantity < reservation.quantity) throw new Error('Stock quantity is insufficient to complete sale')
        await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { decrement: reservation.quantity } } })
        await tx.inventoryMovement.create({ data: { inventoryItemId: item.id, quantityDelta: -reservation.quantity, type: 'OUT', note: `Reservation sold to ${reservation.customer}` } })
        return tx.reservation.update({ where: { id: reservation.id }, data: { status: 'SOLD' } })
      })
      return res.json({ data: updated })
    }
    const updated = await prisma.reservation.update({ where: { id: reservation.id }, data: { status: target } })
    return res.json({ data: updated })
  } catch (error) { return next(error) }
})
