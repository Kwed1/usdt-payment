const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window._env_?.VITE_API_URL) {
    return window._env_.VITE_API_URL
  }

  return import.meta.env.VITE_API_URL
}

export const API_BASE_URL = getApiBaseUrl()

export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  return `${baseUrl}/${cleanPath}`
}



