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
