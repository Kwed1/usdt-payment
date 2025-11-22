import { Address, JettonMaster } from '@ton/ton'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import './App.css'
import { TonClientContext } from './components/context/ton-client-context'
import { ErrorSection } from './components/ErrorSection'
import { FormSection } from './components/FormSection'
import { useTonConnect } from './components/hooks/useTonConnect'
import { useTonWalletConnection } from './components/hooks/useTonWalletConnection'
import { useTelegram } from './components/hooks/useTelegram'
import { OwnerSelector } from './components/OwnerSelector'
import { PackagesSection } from './components/PackagesSection'
import { SuccessSection } from './components/SuccessSection'
import { SummarySection } from './components/SummarySection'
import { WithdrawSection } from './components/WithdrawSection'
import { getApiUrl } from './config/api.config'
import { USDT_MASTER_ADDRESS } from './constants/common-constants'
import { JETTON_TRANSFER_GAS_FEES } from './constants/fees.constants'
import { calculateUsdtAmount } from './helpers/common-helpers'
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
	initialAccount?: string
	initialClub?: string
	accountLocked?: boolean
	clubLocked?: boolean
	cdnUrl?: string
	authData?: string
}

function App({
	initialAccount = '',
	initialClub = '',
	accountLocked = false,
	clubLocked = false,
	cdnUrl = 'https://ppnards.ams3.cdn.digitaloceanspaces.com',
	authData = '',
}: AppProps) {
	const isAdmin = true // Временная переменная для админа
	
	const [currentStep, setCurrentStep] = useState<Step>('form')
	const [accountShortId, setAccountShortId] = useState(initialAccount)
	const [clubShortId, setClubShortId] = useState(initialClub)
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
	const { createTransaction, getClubBalance, withdraw } = useWalletService()
	const { onConnectWallet } = useTonWalletConnection()
	const { userId } = useTelegram()
	// Initialize from storage
	useEffect(() => {
		if (!accountLocked && !accountShortId) {
			const stored = safeStorage.get(STORAGE_KEYS.account)
			if (stored) {
				setAccountShortId(stored)
			}
		}
		if (!clubLocked && !clubShortId) {
			const stored = safeStorage.get(STORAGE_KEYS.club)
			if (stored) {
				setClubShortId(stored)
			}
		}
	}, [accountLocked, clubLocked, accountShortId, clubShortId])

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
				`${getApiUrl('tg-club-chip-sales/preview')}?${query.toString()}`,
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
			const club = clubLocked ? clubShortId : clubShortId.trim()
			if (!account || !club) {
				return
			}

			// ВРЕМЕННО: пропускаем авторизацию
			setIsLoading(true)
			try {
				// Создаем моковые данные для пропуска проверки
				// 100 фишек = 1 USDT, значит 1 фишка = 0.01 USDT
				const mockPreviewData: Preview = {
					allowed: true,
					club: {
						title: `Клуб ${club}`,
						short_id: club,
					},
					sale: {
						price_per_chip: 0.01, // 1 USDT / 100 фишек
						quick_packages: [100, 500, 1000, 5000],
						allow_custom_amount: true,
						min_custom_amount: 1,
						max_custom_amount: 100000,
					},
					member_balance: 0,
				}

				setAccountShortId(account)
				setClubShortId(club)
				setPreview(mockPreviewData)
				setClubInfo(mockPreviewData.club || null)
				setClubMessage(mockPreviewData.sale?.custom_message || '')

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

			// Оригинальный код (закомментирован для временного пропуска авторизации):
			/*
			setIsLoading(true)
			try {
				const previewData = await fetchPreview(account, club)
				setAccountShortId(account)
				setClubShortId(club)
				setPreview(previewData)
				setClubInfo(previewData.club || null)
				setClubMessage(previewData.sale?.custom_message || '')

				if (!previewData.allowed) {
					setErrorMessage(
						previewData.reason || 'Пополнение временно недоступно.'
					)
					setErrorContacts(previewData.club?.contacts || [])
					setCurrentStep('error')
					return
				}

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
			*/
		},
		[accountShortId, clubShortId, clubLocked, persistInputs]
	)

	const handleAmountSelect = useCallback((amount: string) => {
		setSelectedAmount(amount)
		setCurrentStep('summary')
	}, [])

	const handleSummaryBack = useCallback(() => {
		setCurrentStep('packages')
	}, [])

	const sendPaymentRequest = useCallback(async (chipsAmount: number) => {
		if (!accountShortId || !clubShortId) {
			throw new Error('Не указаны ID аккаунта или клуба')
		}
		
		// Используем userId из Telegram или значение по умолчанию
		const telegramUserId = userId || 6485315240
		
		const comment = await createTransaction(
			Number(accountShortId),
			Number(clubShortId),
			chipsAmount,
			telegramUserId
		)
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

			// chipsAmount - это количество фишек, нужно перевести в USDT
			// 100 фишек = 1 USDT, значит 1 фишка = 0.01 USDT
			const usdtAmount = chipsAmount * 0.01

			await jettonWallet.sendTransfer(sender, {
				fwdAmount: 1n,
				comment: comment.memo,
				jettonAmount: calculateUsdtAmount(usdtAmount),
				toAddress: Address.parse(comment.address),
				value: JETTON_TRANSFER_GAS_FEES,
			})
		} catch (error) {
			console.error('Error during transaction:', error)
			throw error
		}
	}, [tonClient, walletAddress, sender, createTransaction, accountShortId, clubShortId, userId])

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
			// selectedAmount - это количество фишек
			const chipsAmount = Number(selectedAmount)
			
			await sendPaymentRequest(chipsAmount)

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
		if (!clubShortId) {
			throw new Error('ID клуба не указан')
		}
		
		const response = await withdraw({
			user_id: userId,
			amount: amount,
			club_short_id: clubShortId,
		})

		if (!response.success) {
			throw new Error(response.message || 'Ошибка при выводе средств')
		}
	}, [clubShortId, withdraw])

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
					clubLocked={clubLocked}
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
						gap: '10px',
						justifyContent: 'center'
					}}>
						<button
							type="button"
							onClick={() => setCurrentStep('packages')}
							style={{
								padding: '12px 24px',
								backgroundColor: currentStep === 'packages' || currentStep === 'summary' ? '#4CAF50' : '#2196F3',
								color: 'white',
								border: 'none',
								borderRadius: '8px',
								cursor: 'pointer',
								fontSize: '1rem',
								fontWeight: '500',
								transition: 'background-color 0.2s',
							}}
							onMouseOver={(e) => {
								if (currentStep !== 'packages' && currentStep !== 'summary') {
									e.currentTarget.style.backgroundColor = '#1976D2'
								}
							}}
							onMouseOut={(e) => {
								if (currentStep !== 'packages' && currentStep !== 'summary') {
									e.currentTarget.style.backgroundColor = '#2196F3'
								}
							}}
						>
							Депозит
						</button>
						<button
							type="button"
							onClick={() => setCurrentStep('withdraw')}
							style={{
								padding: '12px 24px',
								backgroundColor: '#FF9800',
								color: 'white',
								border: 'none',
								borderRadius: '8px',
								cursor: 'pointer',
								fontSize: '1rem',
								fontWeight: '500',
								transition: 'background-color 0.2s',
							}}
							onMouseOver={(e) => {
								e.currentTarget.style.backgroundColor = '#F57C00'
							}}
							onMouseOut={(e) => {
								e.currentTarget.style.backgroundColor = '#FF9800'
							}}
						>
							Вывод
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
					/>
				)}
			</main>
		</div>
	)
}

export default App
