import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWalletService, type ConnectWalletRequestBody } from '../../services/wallet-service'

export const useTonWalletConnection = () => {
	const wallet = useTonWallet()
	const [tonConnectUI] = useTonConnectUI()
	const { generatePayload, connectWallet, disconnectWallet } = useWalletService()

	const [isGeneratingPayload, setIsGeneratingPayload] = useState(false)
	const [isConnecting, setIsConnecting] = useState(false)
	const [connectionError, setConnectionError] = useState<string | null>(null)
	const lastProofRef = useRef<string | null>(null)

	const onConnectWallet = useCallback(async () => {
		try {
			setIsGeneratingPayload(true)
			setConnectionError(null)
			tonConnectUI.setConnectRequestParameters({ state: 'loading' })

			const response = await generatePayload()

			if (response) {
				tonConnectUI.setConnectRequestParameters({
					state: 'ready',
					value: {
						tonProof: response,
					},
				})
				tonConnectUI.openModal()
			} else {
				throw new Error('Не удалось получить payload для подключения')
			}
		} catch (error) {
			console.error('Error generating payload:', error)
			setConnectionError((error as Error).message || 'Ошибка при генерации payload')
			tonConnectUI.setConnectRequestParameters(null)
		} finally {
			setIsGeneratingPayload(false)
		}
	}, [tonConnectUI, generatePayload])

	const onDisconnectWallet = useCallback(async () => {
		if (wallet) {
			try {
				tonConnectUI.disconnect()
				await disconnectWallet()
				lastProofRef.current = null
			} catch (error) {
				console.error('Error disconnecting wallet:', error)
			}
		}
	}, [wallet, tonConnectUI, disconnectWallet])

	useEffect(() => {
		const handleStatusChange = async (wallet: any) => {
			if (!wallet) {
				onDisconnectWallet()
				return
			}

			if (
				wallet.connectItems?.tonProof &&
				'proof' in wallet.connectItems.tonProof
			) {
				const proof = JSON.stringify(wallet.connectItems.tonProof.proof)

				// Предотвращаем повторную отправку того же proof
				if (lastProofRef.current === proof) {
					return
				}

				lastProofRef.current = proof
				setIsConnecting(true)
				setConnectionError(null)

				try {
					const account = wallet.account
					const reqBody: ConnectWalletRequestBody = {
						address: account.address,
						public_key: account.publicKey,
						proof: wallet.connectItems.tonProof.proof,
					}

					const response = await connectWallet(reqBody)

					if (response?.success !== true) {
						await onDisconnectWallet()
						setConnectionError('Не удалось подтвердить подключение кошелька')
					}
				} catch (error) {
					console.error('Error connecting wallet:', error)
					await onDisconnectWallet()
					setConnectionError((error as Error).message || 'Ошибка при подключении кошелька')
				} finally {
					setIsConnecting(false)
				}
			}
		}

		tonConnectUI.onStatusChange(handleStatusChange)

		return () => {
			// Cleanup если нужно
		}
	}, [tonConnectUI, connectWallet, onDisconnectWallet])

	return {
		wallet,
		onConnectWallet,
		onDisconnectWallet,
		isGeneratingPayload,
		isConnecting,
		connectionError
	}
}

