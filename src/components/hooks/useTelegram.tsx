import { initDataUser } from '@telegram-apps/sdk'

export function useTelegram() {
	const data = initDataUser()
	const userId = data?.id 
	const user = data?.username
	const tg_lg = data?.language_code
	const name = data?.first_name
	return {
		userId,
		user,
		name,
		tg_lg,
	}
}
