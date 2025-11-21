import { THEME, TonConnectUIProvider } from '@tonconnect/ui-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { TonClientProvider } from './components/context/ton-client-context.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
	<TonConnectUIProvider
		manifestUrl='https://raw.githubusercontent.com/XaBbl4/pytonconnect/main/pytonconnect-manifest.json'
		uiPreferences={{ theme: THEME.DARK }}
	>
		<TonClientProvider>
			<StrictMode>
				<App />
			</StrictMode>
		</TonClientProvider>
	</TonConnectUIProvider>
)
