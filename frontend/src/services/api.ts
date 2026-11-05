const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export async function getHealth(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${baseUrl}/health`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json() as Promise<{ status: string; service: string }>
}