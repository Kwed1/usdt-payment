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
import { USDT_MASTER_ADDRESS } from './constants/common-constants'
import { JETTON_TRANSFER_GAS_FEES } from './constants/fees.constants'
import { calculateUsdtAmount } from './helpers/common-helpers'
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
	const { auth, createTransaction, getClubBalance, withdraw } = useWalletService()
	const { onConnectWallet } = useTonWalletConnection()

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
			const query = new URLSearchParams({
				account_short_id: String(account),
				club_short_id: String(club),
			})
			const response = await fetch(
				`${getApiUrl('preview')}?${query.toString()}`,
				{
					headers: {
						Accept: 'application/json',
					},
				}
			)
			if (!response.ok) {
				throw new Error('Не удалось получить данные. Попробуйте позже.')
			}
			return response.json()
		},
		[]
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

				// Если allowed: true, продолжаем
				setAccountShortId(account)
				setClubShortId(club)
				setPreview(previewData)
				setClubInfo(previewData.club || null)
				setClubMessage(previewData.sale?.custom_message || '')

				persistInputs()
				setCurrentStep('packages')
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
		[accountShortId, clubShortId, clubLocked, authClubId, persistInputs, fetchPreview]
	)

	const handleAmountSelect = useCallback((amount: string) => {
		setSelectedAmount(amount)
		setCurrentStep('summary')
	}, [])

	const handleSummaryBack = useCallback(() => {
		setCurrentStep('packages')
	}, [])

	const sendPaymentRequest = useCallback(async (amount: number) => {
		if (!accountShortId || !clubShortId || !selectedAmount) {
			throw new Error('Не указаны необходимые данные для транзакции')
		}
		
		const comment = await createTransaction({
			tg_user_id: 0, // Можно получить из authData или другого источника
			account_short_id: Number(accountShortId),
			club_short_id: Number(clubShortId),
			chips_amount: Number(selectedAmount),
		})
		
		try {
			if (!tonClient || !walletAddress || !comment) {
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

			await jettonWallet.sendTransfer(sender, {
				fwdAmount: 1n,
				comment: comment.memo,
				jettonAmount: calculateUsdtAmount(Number(amount) * 100),
				toAddress: Address.parse(comment.address),
				value: JETTON_TRANSFER_GAS_FEES,
			})
		} catch (error) {
			console.error('Error during transaction:', error)
			throw error
		}
	}, [tonClient, walletAddress, sender, createTransaction, accountShortId, clubShortId, selectedAmount])

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
			// Вызываем функцию оплаты через TON
			const amount = Number(selectedAmount)
			const usdtAmount = amount * 0.01 // 100 фишек = 1 USDT
			
			await sendPaymentRequest(usdtAmount)

			// После успешной транзакции показываем сообщение об успехе
			setSuccessMessage(
				'Оплата принята. Фишки появятся на балансе в ближайшие секунды.'
			)
			setCurrentStep('success')
		} catch (error) {
			setErrorMessage(
				(error as Error).message || 'Не удалось выполнить оплату.'
			)
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
			const response = await fetch(getApiUrl('tg-club-chip-sales/owner-clubs'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
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
				const response = await fetch(getApiUrl('tg-club-chip-sales/owner-insights'), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
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
		const userIdNum = Number(userId)
		if (isNaN(userIdNum) || userIdNum <= 0) {
			throw new Error('Некорректный User ID')
		}
		
		const response = await withdraw({
			tg_user_id: userIdNum,
			amount: amount,
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

				{isAdmin && preview && preview.allowed && (
					<div style={{ 
						marginTop: '20px', 
						marginBottom: '20px',
						display: 'flex', 
						gap: '12px',
						justifyContent: 'center'
					}}>
						<button
							type="button"
							onClick={() => setCurrentStep('packages')}
							style={{
								padding: '14px 28px',
								background: currentStep === 'packages' || currentStep === 'summary' 
									? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
									: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
								color: 'white',
								border: 'none',
								borderRadius: '12px',
								cursor: 'pointer',
								fontSize: '1rem',
								fontWeight: '600',
								boxShadow: currentStep === 'packages' || currentStep === 'summary'
									? '0 4px 15px rgba(76, 175, 80, 0.4), 0 2px 8px rgba(76, 175, 80, 0.2)'
									: '0 4px 15px rgba(33, 150, 243, 0.3), 0 2px 8px rgba(33, 150, 243, 0.2)',
								transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
								transform: 'translateY(0)',
								position: 'relative',
								overflow: 'hidden',
							}}
							onMouseEnter={(e) => {
								if (currentStep !== 'packages' && currentStep !== 'summary') {
									e.currentTarget.style.transform = 'translateY(-2px)'
									e.currentTarget.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.4), 0 4px 12px rgba(33, 150, 243, 0.3)'
								}
							}}
							onMouseLeave={(e) => {
								if (currentStep !== 'packages' && currentStep !== 'summary') {
									e.currentTarget.style.transform = 'translateY(0)'
									e.currentTarget.style.boxShadow = '0 4px 15px rgba(33, 150, 243, 0.3), 0 2px 8px rgba(33, 150, 243, 0.2)'
								}
							}}
							onMouseDown={(e) => {
								e.currentTarget.style.transform = 'translateY(0) scale(0.98)'
							}}
							onMouseUp={(e) => {
								e.currentTarget.style.transform = currentStep === 'packages' || currentStep === 'summary' 
									? 'translateY(0)' 
									: 'translateY(-2px)'
							}}
						>
							💳 Депозит
						</button>
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
						clubShortId={clubShortId || ''}
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
