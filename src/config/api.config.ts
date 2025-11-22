
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vowwin-api.webdevops.online'


export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${API_BASE_URL}/${cleanPath}`
}


