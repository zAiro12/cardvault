const apiBase = (process.env.CARDTRADER_API_URL || 'https://api.cardtrader.com/api/v2').replace(/\/$/, '')

export async function cardTraderRequest<T>(path: string): Promise<T> {
  const token = process.env.CARDTRADER_API_TOKEN
  if (!token) throw new Error('CARDTRADER_API_TOKEN is not configured')
  const response = await fetch(`${apiBase}/${path.replace(/^\//, '')}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`CardTrader API responded ${response.status}`)
  return response.json() as Promise<T>
}