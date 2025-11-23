import { initData } from '@telegram-apps/sdk'
import { Address, JettonMaster } from '@ton/ton'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import './App.css'
import { TonClientContext } from './components/context/ton-client-context'
import { ErrorSection } from './components/ErrorSection'
import { FormSection } from './components/FormSection'
import { useTonConnect } from './components/hooks/useTonConnect'
import { useTonWalletConnection } from './components/hooks/useTonWalletConnection'
import { OwnerSelector } from './components/OwnerSelector'
import { PackagesSection } from './components/PackagesSection'
import { SuccessSection } from './components/SuccessSection'
import { SummarySection } from './components/SummarySection'
import { WithdrawSection } from './components/WithdrawSection'
import { getApiUrl } from './config/api.config'
import { getAuthToken } from './services/wallet-service'
import { USDT_MASTER_ADDRESS } from './constants/common-constants'
import { JETTON_TRANSFER_GAS_FEES } from './constants/fees.constants'
import { init } from './init'
import { useWalletService } from './services/wallet-service'
import type {
	ClubInfo,
	Contact,
	OwnerClub,
	OwnerStats,
	Preview,
	Step,
} from './types'
import { JettonWallet } from './wrappers/JettonWallet'

const STORAGE_KEYS = {
	account: 'tg_club_chip_sales_account',
	club: 'tg_club_chip_sales_club',
}

const safeStorage = {
	get(key: string): string | null {
		try {
			return window.localStorage ? window.localStorage.getItem(key) : null
		} catch (error) {
			console.warn('localStorage get failed', error)
			return null
		}
	},
	set(key: string, value: string): void {
		try {
			if (window.localStorage) {
				window.localStorage.setItem(key, value)
			}
		} catch (error) {
			console.warn('localStorage set failed', error)
		}
	},
}

interface AppProps {
	accountLocked?: boolean
	clubLocked?: boolean
	cdnUrl?: string
	authData?: string
}

function App({
	accountLocked = false,
	clubLocked = false,
	cdnUrl = 'https://ppnards.ams3.cdn.digitaloceanspaces.com',
	authData = '',
}: AppProps) {
	const [isAdmin, setIsAdmin] = useState(false)
	const [isAuthLoading, setIsAuthLoading] = useState(true)
	const [authClubId, setAuthClubId] = useState<number | null>(null)
	if (process.env.NODE_ENV === "production") {
    init();
  }
	const [currentStep, setCurrentStep] = useState<Step>('form')
	const [accountShortId, setAccountShortId] = useState('')
	const [clubShortId, setClubShortId] = useState('')
	const [preview, setPreview] = useState<Preview | null>(null)
	const [selectedAmount, setSelectedAmount] = useState<string | null>(null)
	const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null)
	const [clubMessage, setClubMessage] = useState('')
	const [errorMessage, setErrorMessage] = useState('')
	const [errorContacts, setErrorContacts] = useState<Contact[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [successMessage, setSuccessMessage] = useState('')

	// Owner selector state
	const [ownerClubs, setOwnerClubs] = useState<OwnerClub[]>([])
	const [ownerClubsByShortId, setOwnerClubsByShortId] = useState<
		Record<string, OwnerClub>
	>({})
	const [ownerClubsLoaded, setOwnerClubsLoaded] = useState(false)
	const [ownerSelectorMessage, setOwnerSelectorMessage] = useState<
		string | null
	>(null)
	const [ownerStatsCache, setOwnerStatsCache] = useState<
		Record<string, OwnerStats>
	>({})
	const [selectedOwnerClubShortId, setSelectedOwnerClubShortId] = useState<
		number | null
	>(null)
	const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null)
	const [ownerStatsLoading, setOwnerStatsLoading] = useState(false)
	const { sender, walletAddress, connected } = useTonConnect()
	const { tonClient } = useContext(TonClientContext)
	const { auth, createTransaction, getClubBalance, withdraw, getPreview } = useWalletService()
	const { onConnectWallet, isConnecting, connectionError } = useTonWalletConnection()

	useEffect(() => {
		const performAuth = async () => {
			setIsAuthLoading(true)
			try {
				const rawInitData = initData?.raw() || "auth_date=6485315240&query_id=abcd1234&user={\"id\":6485315240,\"username\":\"example_user\"}&hash=da1dfb07135fe48b49c10a92903d9acc70a50b63ffb68a34ee4e836bf93b034f"
				const response = await auth({ init_data: rawInitData })
				setIsAdmin(response.role === 'admin')
				setAuthClubId(response.club_id)
				
				// Если club_id пришел с бэка, устанавливаем его
				if (response.club_id !== null) {
					setClubShortId(String(response.club_id))
				}
			} catch (error) {
				console.error('Ошибка авторизации:', error)
				setIsAdmin(false)
			} finally {
				setIsAuthLoading(false)
			}
		}

		performAuth()
	}, [auth, authData])

	// Initialize from storage - убрано для чистых инпутов
	// useEffect(() => {
	// 	if (!accountLocked && !accountShortId) {
	// 		const stored = safeStorage.get(STORAGE_KEYS.account)
	// 		if (stored) {
	// 			setAccountShortId(stored)
	// 		}
	// 	}
	// 	if (!clubLocked && !clubShortId) {
	// 		const stored = safeStorage.get(STORAGE_KEYS.club)
	// 		if (stored) {
	// 			setClubShortId(stored)
	// 		}
	// 	}
	// }, [accountLocked, clubLocked, accountShortId, clubShortId])

	const persistInputs = useCallback(() => {
		if (accountShortId) {
			safeStorage.set(STORAGE_KEYS.account, accountShortId)
		}
		if (clubShortId) {
			safeStorage.set(STORAGE_KEYS.club, clubShortId)
		}
	}, [accountShortId, clubShortId])

	const fetchPreview = useCallback(
		async (account: string, club: string): Promise<Preview> => {
			const previewData = await getPreview(Number(account), Number(club))
			return previewData
		},
		[getPreview]
	)

	const handleFormSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault()
			const account = accountShortId.trim()
			// Используем club_id из auth если он есть, иначе берем из инпута
			const club = authClubId !== null ? String(authClubId) : (clubLocked ? clubShortId : clubShortId.trim())
			if (!account || !club) {
				return
			}

			setIsLoading(true)
			try {
				const previewData = await fetchPreview(account, club)
				
				// Проверяем allowed
				if (!previewData.allowed) {
					setErrorMessage(previewData.reason || 'Доступ запрещен')
					setErrorContacts(previewData.club?.contacts || [])
					setCurrentStep('error')
					setIsLoading(false)
					return
				}

				// Если allowed: true, сохраняем данные
				setAccountShortId(account)
				setClubShortId(club)
				setPreview(previewData)
				setClubInfo(previewData.club || null)
				setClubMessage(previewData.sale?.custom_message || '')

				persistInputs()

				// Проверяем подключение кошелька
				if (!connected || !walletAddress) {
					// Запрашиваем подключение кошелька
					try {
						await onConnectWallet()
						// После подключения переходим к выбору пакетов
						setCurrentStep('packages')
					} catch (error) {
						// Если пользователь отклонил подключение, все равно переходим к пакетам
						// Пользователь сможет подключить кошелек позже
						setCurrentStep('packages')
					}
				} else {
					// Кошелек уже подключен, переходим к пакетам
					setCurrentStep('packages')
				}
			} catch (error) {
				setErrorMessage(
					(error as Error).message || 'Не удалось получить данные.'
				)
				setErrorContacts([])
				setCurrentStep('error')
			} finally {
				setIsLoading(false)
			}
		},
		[accountShortId, clubShortId, clubLocked, authClubId, persistInputs, fetchPreview, connected, walletAddress, onConnectWallet]
	)

	const handleAmountSelect = useCallback((amount: string) => {
		setSelectedAmount(amount)
		setCurrentStep('summary')
	}, [])

	const handleSummaryBack = useCallback(() => {
		setCurrentStep('packages')
	}, [])

	const sendPaymentRequest = useCallback(async (usdtAmount: number) => {
		if (!accountShortId || !clubShortId || !selectedAmount || !preview?.sale) {
			throw new Error('Не указаны необходимые данные для транзакции')
		}
		
		console.log('sendPaymentRequest - usdtAmount:', usdtAmount)
		
		// selectedAmount теперь в USDT, конвертируем обратно в фишки для бэкенда
		const pricePerChip = Number(preview.sale.price_per_chip)
		const chipsAmount = Math.round(usdtAmount / pricePerChip)
		
		console.log('Calculated chipsAmount:', chipsAmount, 'from USDT:', usdtAmount, 'pricePerChip:', pricePerChip)
		
		if (chipsAmount <= 0) {
			throw new Error('Сумма слишком мала')
		}
		
		const comment = await createTransaction({
			account_short_id: Number(accountShortId),
			club_short_id: Number(clubShortId),
			chips_amount: chipsAmount,
		})
		
		try {
			if (!tonClient || !walletAddress || !comment || !comment.address || !comment.memo) {
				throw new Error('Не удалось инициализировать транзакцию. Проверьте подключение кошелька.')
			}

			const jettonMaster = tonClient.open(
				JettonMaster.create(USDT_MASTER_ADDRESS)
			)
			const usersUsdtAddress = await jettonMaster.getWalletAddress(
				walletAddress
			)

			const jettonWallet = tonClient.open(
				JettonWallet.createFromAddress(usersUsdtAddress)
			)

			// USDT имеет 6 знаков после запятой, поэтому умножаем на 1,000,000
			// usdtAmount уже в USDT (например, 30 USDT)
			const nanoUsdtAmount = BigInt(Math.round(usdtAmount * 1000000))
			
			console.log('Sending transaction - USDT amount:', usdtAmount, 'nanoUSDT:', nanoUsdtAmount.toString())

			await jettonWallet.sendTransfer(sender, {
				fwdAmount: 1n,
				comment: comment.memo,
				jettonAmount: nanoUsdtAmount,
				toAddress: Address.parse(comment.address),
				value: JETTON_TRANSFER_GAS_FEES,
			})
			
			console.log('Transaction sent successfully')
		} catch (error) {
			console.error('Error during transaction:', error)
			throw error
		}
	}, [tonClient, walletAddress, sender, createTransaction, accountShortId, clubShortId, selectedAmount, preview])

	const handleSummaryConfirm = useCallback(async () => {
		if (!selectedAmount) {
			return
		}

		// Проверяем подключение кошелька
		if (!connected || !walletAddress) {
			setErrorMessage('Пожалуйста, подключите TON кошелек для оплаты.')
			setErrorContacts([])
			setCurrentStep('error')
			return
		}

		setIsLoading(true)
		try {
			// selectedAmount теперь уже в USDT
			const usdtAmount = parseFloat(selectedAmount)
			
			console.log('Payment request - selectedAmount:', selectedAmount, 'usdtAmount:', usdtAmount)
			
			if (usdtAmount <= 0 || isNaN(usdtAmount)) {
				throw new Error('Некорректная сумма для оплаты')
			}
			
			await sendPaymentRequest(usdtAmount)

			// После успешной транзакции показываем сообщение об успехе
			setSuccessMessage(
				'Оплата принята. Фишки появятся на балансе в ближайшие секунды.'
			)
			setCurrentStep('success')
		} catch (error) {
			// Проверяем, отклонил ли пользователь транзакцию в кошельке
			const errorMessage = (error as Error).message || ''
			const errorString = errorMessage.toLowerCase()
			
			if (
				errorString.includes('wallet declined') ||
				errorString.includes('badrequesterror') ||
				errorString.includes('request to the wallet contains errors') ||
				errorString.includes('ton_connect_sdk_error') ||
				errorString.includes('user rejected') ||
				errorString.includes('user cancelled')
			) {
				setErrorMessage('Пользователь отклонил платеж')
			} else {
				setErrorMessage(errorMessage || 'Не удалось выполнить оплату.')
			}
			setErrorContacts([])
			setCurrentStep('error')
		} finally {
			setIsLoading(false)
		}
	}, [selectedAmount, connected, walletAddress, sendPaymentRequest])

	const handleErrorRetry = useCallback(() => {
		setCurrentStep('form')
	}, [])

	const handleSuccessClose = useCallback(() => {
		window.location.reload()
	}, [])

	// Owner selector handlers
	const loadOwnerClubs = useCallback(async () => {
		if (!authData) {
			return
		}

		try {
			const token = getAuthToken()
			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			}
			if (token) {
				headers['Authorization'] = `Bearer ${token}`
			}
			const response = await fetch(getApiUrl('tg-club-chip-sales/owner-clubs'), {
				method: 'POST',
				headers,
				body: JSON.stringify({
					authData: authData,
				}),
			})

			const data = await response.json()
			if (!response.ok || !data.allowed) {
				setOwnerClubs([])
				setOwnerClubsByShortId({})
				setOwnerClubsLoaded(true)
				setOwnerSelectorMessage(
					data.reason || 'Не удалось загрузить список клубов.'
				)
			} else {
				const clubs = Array.isArray(data.clubs) ? data.clubs : []
				setOwnerClubs(clubs)
				const byShortId: Record<string, OwnerClub> = {}
				clubs.forEach((club: OwnerClub) => {
					byShortId[String(club.short_id)] = club
				})
				setOwnerClubsByShortId(byShortId)
				setOwnerClubsLoaded(true)
				setOwnerSelectorMessage(null)
			}
		} catch (error) {
			console.warn('Failed to load owner clubs', error)
			setOwnerClubs([])
			setOwnerClubsByShortId({})
			setOwnerClubsLoaded(true)
			setOwnerSelectorMessage(
				'Не удалось загрузить список клубов. Попробуйте позже.'
			)
		}
	}, [authData])

	const fetchOwnerStats = useCallback(
		async (clubShortId: number) => {
			if (!clubShortId || ownerStatsLoading) {
				return
			}

			const key = String(clubShortId)
			setSelectedOwnerClubShortId(clubShortId)

			if (ownerStatsCache[key]) {
				setOwnerStats(ownerStatsCache[key])
				setOwnerSelectorMessage(null)
				return
			}

			setOwnerStatsLoading(true)
			setOwnerStats(null)

			try {
				const token = getAuthToken()
				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				}
				if (token) {
					headers['Authorization'] = `Bearer ${token}`
				}
				const response = await fetch(getApiUrl('tg-club-chip-sales/owner-insights'), {
					method: 'POST',
					headers,
					body: JSON.stringify({
						authData: authData,
						club_short_id: Number(clubShortId),
					}),
				})

				const data = await response.json()
				if (response.ok && data.allowed) {
					setOwnerStatsCache(prev => ({ ...prev, [key]: data }))
					setOwnerStats(data)
					setOwnerSelectorMessage(null)
				} else {
					setOwnerStats(data)
					setOwnerSelectorMessage(
						data.reason || 'Недостаточно прав для просмотра данных клуба.'
					)
				}
			} catch (error) {
				console.warn('Failed to load owner insights', error)
				setOwnerStats(null)
				setOwnerSelectorMessage(
					'Не удалось загрузить данные клуба. Попробуйте позже.'
				)
			} finally {
				setOwnerStatsLoading(false)
			}
		},
		[authData, ownerStatsCache, ownerStatsLoading]
	)

	const handleOwnerClubSelect = useCallback(
		(clubShortId: number | null) => {
			setSelectedOwnerClubShortId(clubShortId)
			if (clubShortId && ownerStatsCache[String(clubShortId)]) {
				setOwnerStats(ownerStatsCache[String(clubShortId)])
				setOwnerSelectorMessage(null)
			} else {
				setOwnerStats(null)
			}
		},
		[ownerStatsCache]
	)

	const handleOwnerClubOpen = useCallback(() => {
		if (selectedOwnerClubShortId) {
			fetchOwnerStats(selectedOwnerClubShortId)
		}
	}, [selectedOwnerClubShortId, fetchOwnerStats])

	useEffect(() => {
		if (authData) {
			loadOwnerClubs()
		}
	}, [authData, loadOwnerClubs])

	const handleWithdraw = useCallback(async (userId: string, amount: number) => {
		// tg_user_id берется из токена на бэкенде
		// userId здесь не используется, но оставляем для совместимости с интерфейсом
		const amountNum = Number(amount)
		if (isNaN(amountNum) || amountNum <= 0) {
			throw new Error('Некорректная сумма')
		}
		
		const response = await withdraw({
			amount: amountNum,
		})

		if (!response.success) {
			throw new Error(response.message || 'Ошибка при выводе средств')
		}
	}, [withdraw])

	// Показываем загрузку, пока авторизация не завершится
	if (isAuthLoading) {
		return (
			<div style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#0b1120',
				zIndex: 9999
			}}>
				<div className="loader" style={{ margin: '0 auto' }}></div>
				<p style={{ 
					marginTop: '20px', 
					color: 'var(--text-secondary)',
					fontSize: '1rem'
				}}>
					Загрузка...
				</p>
			</div>
		)
	}

	return (
		<div className='app'>
			<header>
				<h1>Покупка фишек</h1>
				<p>
					Введите свой ID игрока и ID клуба, чтобы пополнить баланс фишек за
					USDT.
				</p>
			</header>
			<main>
				{authData && (
					<OwnerSelector
						ownerClubs={ownerClubs}
						ownerClubsLoaded={ownerClubsLoaded}
						ownerSelectorMessage={ownerSelectorMessage}
						selectedOwnerClubShortId={selectedOwnerClubShortId}
						ownerStats={ownerStats}
						ownerStatsLoading={ownerStatsLoading}
						onClubSelect={handleOwnerClubSelect}
						onClubOpen={handleOwnerClubOpen}
					/>
				)}

				<FormSection
					accountShortId={accountShortId}
					clubShortId={clubShortId}
					accountLocked={accountLocked}
					clubLocked={clubLocked || authClubId !== null}
					clubInfo={clubInfo}
					onAccountChange={setAccountShortId}
					onClubChange={setClubShortId}
					onSubmit={handleFormSubmit}
					cdnUrl={cdnUrl}
					isActive={currentStep === 'form'}
				/>

				{isAdmin && (
					<div style={{ 
						marginTop: '20px', 
						marginBottom: '20px',
						display: 'flex', 
						gap: '12px',
						justifyContent: 'center'
					}}>
						<button
							type="button"
							onClick={() => setCurrentStep('withdraw')}
							style={{
								padding: '14px 28px',
								background: currentStep === 'withdraw'
									? 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)'
									: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
								color: 'white',
								border: 'none',
								borderRadius: '12px',
								cursor: 'pointer',
								fontSize: '1rem',
								fontWeight: '600',
								boxShadow: currentStep === 'withdraw'
									? '0 4px 15px rgba(245, 124, 0, 0.4), 0 2px 8px rgba(245, 124, 0, 0.2)'
									: '0 4px 15px rgba(255, 152, 0, 0.3), 0 2px 8px rgba(255, 152, 0, 0.2)',
								transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
								transform: 'translateY(0)',
								position: 'relative',
								overflow: 'hidden',
							}}
							onMouseEnter={(e) => {
								if (currentStep !== 'withdraw') {
									e.currentTarget.style.transform = 'translateY(-2px)'
									e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.4), 0 4px 12px rgba(255, 152, 0, 0.3)'
								}
							}}
							onMouseLeave={(e) => {
								if (currentStep !== 'withdraw') {
									e.currentTarget.style.transform = 'translateY(0)'
									e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.3), 0 2px 8px rgba(255, 152, 0, 0.2)'
								}
							}}
							onMouseDown={(e) => {
								e.currentTarget.style.transform = 'translateY(0) scale(0.98)'
							}}
							onMouseUp={(e) => {
								e.currentTarget.style.transform = currentStep === 'withdraw' 
									? 'translateY(0)' 
									: 'translateY(-2px)'
							}}
						>
							💰 Вывод
						</button>
					</div>
				)}


				<ErrorSection
					message={errorMessage}
					contacts={errorContacts}
					onRetry={handleErrorRetry}
					isActive={currentStep === 'error'}
				/>

				<PackagesSection
					sale={preview?.sale || null}
					clubMessage={clubMessage}
					onAmountSelect={handleAmountSelect}
					isLoading={isLoading}
					isActive={currentStep === 'packages'}
					walletConnected={connected}
					onConnectWallet={onConnectWallet}
					isVerifyingProof={isConnecting}
					proofError={connectionError}
				/>

				{preview?.sale && (
					<SummarySection
						selectedAmount={selectedAmount || ''}
						pricePerChip={preview.sale.price_per_chip}
						memberBalance={preview.member_balance || 0}
						clubInfo={clubInfo}
						clubMessage={clubMessage}
						cdnUrl={cdnUrl}
						onConfirm={handleSummaryConfirm}
						onBack={handleSummaryBack}
						isLoading={isLoading}
						isActive={currentStep === 'summary'}
					/>
				)}

				<SuccessSection
					message={successMessage}
					onClose={handleSuccessClose}
					isActive={currentStep === 'success'}
				/>

				{isAdmin && (
					<WithdrawSection
						clubShortId={authClubId !== null ? String(authClubId) : (clubShortId || '')}
						onWithdraw={handleWithdraw}
						getClubBalance={getClubBalance}
						isActive={currentStep === 'withdraw'}
						isLoading={isLoading}
						onError={(message) => {
							setErrorMessage(message);
							setErrorContacts([]);
							setCurrentStep('error');
						}}
					/>
				)}
			</main>
		</div>
	)
}

export default App
