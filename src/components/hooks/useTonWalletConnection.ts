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

			const payload = await generatePayload()
			
			if (payload) {
				tonConnectUI.setConnectRequestParameters({
					state: 'ready',
					value: {
						tonProof: payload,
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
					const tonProof = wallet.connectItems.tonProof.proof
					
					// Формируем правильную структуру proof для бэкенда
					// TonConnect возвращает domain как объект или строку, нужно правильно обработать
					let domainValue = ''
					let domainLengthBytes = 0
					
					if (tonProof.domain) {
						if (typeof tonProof.domain === 'string') {
							domainValue = tonProof.domain
							domainLengthBytes = new TextEncoder().encode(tonProof.domain).length
						} else if (typeof tonProof.domain === 'object') {
							domainValue = tonProof.domain.value || ''
							domainLengthBytes = tonProof.domain.lengthBytes || new TextEncoder().encode(domainValue).length
						}
					}
					
					const reqBody: ConnectWalletRequestBody = {
						address: account.address,
						public_key: account.publicKey,
						proof: {
							timestamp: tonProof.timestamp,
							domain: {
								lengthBytes: domainLengthBytes,
								value: domainValue,
							},
							signature: tonProof.signature,
							payload: tonProof.payload,
						},
					}

					console.log('Verifying wallet proof...', {
						address: reqBody.address,
						hasPublicKey: !!reqBody.public_key,
						hasProof: !!reqBody.proof,
						proofPayload: reqBody.proof.payload.substring(0, 20) + '...'
					})
					
					const response = await connectWallet(reqBody)

					if (!response?.valid) {
						throw new Error('Кошелек не привязался')
					}

					console.log('✅ Wallet proof verified successfully, address:', response.address)
				} catch (error) {
					console.error('Error verifying wallet proof:', error)
					// Отвязываем кошелек при любой ошибке
					await onDisconnectWallet()
					// Устанавливаем сообщение об ошибке
					setConnectionError('Кошелек не привязался')
					throw error // Пробрасываем ошибку дальше для обработки
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

