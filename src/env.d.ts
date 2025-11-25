export { }

declare global {
	interface Window {
		_env_?: {
			[key: string]: string | undefined
			VITE_API_URL?: string
		}
		__ENV__?: {
			[key: string]: string | undefined
			VITE_API_URL?: string
		}
	}
}
