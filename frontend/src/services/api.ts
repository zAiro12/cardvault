const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

// Localhost is valid only during local development. GitHub Pages is a static
// production site, so it must receive the deployed Vercel API URL at build time.
const baseUrl = (configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:3000/api' : '')).replace(/\/$/, '')

function apiUrl(path: string): string {
  if (!baseUrl) {
    throw new Error('VITE_API_URL non configurata: imposta l’URL pubblico del backend Vercel nelle variabili di build GitHub Pages.')
  }
  return `${baseUrl}${path}`
}

export async function getHealth(): Promise<{ status: string; service: string }> {
  const response = await fetch(apiUrl('/health'))
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<{ status: string; service: string }>
}

export type Game = 'MAGIC' | 'POKEMON' | 'YU_GI_OH' | 'LORCANA' | 'OTHER'
export type CardRecord = { id: string; game: Game; name: string; setName?: string | null; collectorNumber?: string | null; language: string; foil: boolean; variant?: string | null }
export type InventoryRecord = { id: string; quantity: number; condition: string; purchasePrice?: string | number | null; marketPrice?: string | number | null; notes?: string | null; card: CardRecord; location?: { name: string } | null; reservations?: { quantity: number; status: string; customer: string }[] }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    let message = `Errore API ${response.status}`
    try { const body = await response.json(); message = body.error || message } catch { /* response may be empty */ }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function getCards(): Promise<CardRecord[]> {
  const result = await request<{ data: CardRecord[] }>('/cards')
  return result.data
}

export async function getInventory(): Promise<InventoryRecord[]> {
  const result = await request<{ data: InventoryRecord[] }>('/inventory')
  return result.data
}

export async function createCard(input: Omit<CardRecord, 'id'>): Promise<CardRecord> {
  const result = await request<{ data: CardRecord }>('/cards', { method: 'POST', body: JSON.stringify(input) })
  return result.data
}

export async function addInventory(input: { cardId: string; quantity: number; condition: string; purchasePrice?: number; marketPrice?: number; location?: string; notes?: string }): Promise<InventoryRecord> {
  const result = await request<{ data: InventoryRecord }>('/inventory', { method: 'POST', body: JSON.stringify(input) })
  return result.data
}

export async function deleteInventory(id: string): Promise<void> {
  await request<void>(`/inventory/${id}`, { method: 'DELETE' })
}

export type CardSuggestion = { scryfallId: string; oracleName: string; name: string; setName: string; setCode: string; collectorNumber: string; language: string; foil: boolean; imageUrl: string | null; marketPrice: string | null }

export async function autocompleteCards(query: string, game: Game): Promise<CardSuggestion[]> {
  const result = await request<{ data: CardSuggestion[] }>(`/cards/autocomplete?q=${encodeURIComponent(query)}&game=${encodeURIComponent(game)}`)
  return result.data
}

export async function getCardTraderMarketPrice(input: { scryfallId: string; cardName: string; setCode: string; language: string; foil: boolean }): Promise<string | null> {
  const query = new URLSearchParams({ scryfallId: input.scryfallId, cardName: input.cardName, setCode: input.setCode, language: input.language, foil: String(input.foil) })
  const result = await request<{ data: { marketPrice: string | null; reason?: string } }>(`/cards/market-price?${query}`)
  return result.data.marketPrice
}
