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
			
			console.log('Calling generatePayload()...')
			const response = await generatePayload()
			console.log('generatePayload response:', response)
			
			if (response?.payload) {
				console.log('Payload received, setting connect parameters:', response.payload)
				// Устанавливаем параметры подключения
				tonConnectUI.setConnectRequestParameters({
					state: 'ready',
					value: {
						tonProof: response.payload,
					},
				})
				
				console.log('Connect parameters set, attempting to open modal...')
				// В TonConnect UI после установки параметров нужно открыть модальное окно
				// Пробуем несколько способов
				setTimeout(() => {
					// Способ 1: Используем openModal() напрямую
					try {
						console.log('Trying openModal()...')
						tonConnectUI.openModal()
						console.log('openModal() called')
					} catch (modalError) {
						console.warn('openModal() failed:', modalError)
						
						// Способ 2: Ищем существующую кнопку TonConnectButton в DOM
						const existingButtons = document.querySelectorAll('tonconnect-button')
						if (existingButtons.length > 0) {
							console.log('Found existing TonConnectButton, trying to click...')
							const button = existingButtons[0] as any
							
							// Пробуем найти кнопку внутри shadow DOM
							if (button.shadowRoot) {
								const innerButton = button.shadowRoot.querySelector('button')
								if (innerButton) {
									console.log('Clicking button in shadow DOM...')
									innerButton.click()
									return
								}
							}
							
							// Пробуем кликнуть напрямую
							if (typeof button.click === 'function') {
								console.log('Clicking button directly...')
								button.click()
								return
							}
						}
						
						// Способ 3: Создаем временную кнопку и добавляем в DOM
						console.log('Creating temporary button...')
						const tempDiv = document.createElement('div')
						tempDiv.style.position = 'fixed'
						tempDiv.style.top = '-9999px'
						tempDiv.style.left = '-9999px'
						tempDiv.style.opacity = '0'
						tempDiv.style.pointerEvents = 'none'
						document.body.appendChild(tempDiv)
						
						const tempButton = document.createElement('tonconnect-button')
						tempDiv.appendChild(tempButton)
						
						// Ждем рендеринга и кликаем
						setTimeout(() => {
							try {
								if (tempButton.shadowRoot) {
									const innerButton = tempButton.shadowRoot.querySelector('button')
									if (innerButton) {
										console.log('Clicking temporary button in shadow DOM...')
										innerButton.click()
										setTimeout(() => {
											if (tempDiv.parentNode) {
												document.body.removeChild(tempDiv)
											}
										}, 1000)
										return
									}
								}
								
								if (typeof (tempButton as any).click === 'function') {
									console.log('Clicking temporary button directly...')
									;(tempButton as any).click()
									setTimeout(() => {
										if (tempDiv.parentNode) {
											document.body.removeChild(tempDiv)
										}
									}, 1000)
									return
								}
								
								if (tempDiv.parentNode) {
									document.body.removeChild(tempDiv)
								}
							} catch (error) {
								console.error('Error with temporary button:', error)
								if (tempDiv.parentNode) {
									document.body.removeChild(tempDiv)
								}
							}
						}, 500)
						
						setConnectionError('Не удалось открыть окно подключения кошелька. Попробуйте обновить страницу.')
					}
				}, 200)
			} else {
				console.error('Payload is missing in response:', response)
				throw new Error('Не удалось получить payload для подключения. Ответ сервера: ' + JSON.stringify(response))
			}
		} catch (error) {
			console.error('Error generating payload:', error)
			const errorMessage = error instanceof Error ? error.message : 'Ошибка при генерации payload'
			setConnectionError(errorMessage)
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

