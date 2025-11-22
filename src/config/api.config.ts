
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://aa9be1c56c6b.ngrok-free.app/tg-club-chip-sales-ton/'

export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  return `${baseUrl}/${cleanPath}`
}



