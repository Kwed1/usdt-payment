import axios from "axios"
import { useMemo } from "react"

export interface ITransactionResponse {
  address: string;
  memo: string;
}

export interface IWallet {
  id: string;
  amount: number;
  description: string;
  created_at?: string;
  currency_type?: "dollar" | "ton" | "trade" | "all";
}

export interface ITransactionData {
  balance: number;
  vowcoins: number;
  transactions: IWallet[];
  total_win: number;
  total_played: number;
}

export interface GeneratePayloadResponse {
  payload: string;
}

export interface ConnectWalletRequestBody {
  address: string;
  public_key: string | undefined;
  proof: object;
}

export interface ConnectWalletResponse {
  success: boolean;
  message?: string;
}
const API_BASE_URL = 'http://localhost:8000/tg-club-chip-sales-ton'


const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface CreateTransactionRequest {
  tg_user_id: number;
  account_short_id: number;
  club_short_id: number;
  chips_amount: number;
}

export const useWalletService = () => {
  return useMemo(() => {
    const createTransaction = async (
      accountShortId: number,
      clubShortId: number,
      chipsAmount: number,
      userId: number
    ): Promise<ITransactionResponse> => {
      const requestData: CreateTransactionRequest = {
        tg_user_id: userId,
        account_short_id: accountShortId,
        club_short_id: clubShortId,
        chips_amount: chipsAmount,
      }
      const url = `${API_BASE_URL}/deposit-data`
      console.log('Making request to:', url)
      console.log('Request data:', requestData)
      try {
        const res = await apiClient.post<ITransactionResponse>('/deposit-data', requestData)
        console.log('Response status:', res.status)
        console.log('Response data:', res.data)
        return res.data || { address: "", memo: "" }
      } catch (error) {
        console.error('Error in createTransaction:', error)
        if (axios.isAxiosError(error)) {
          console.error('Response status:', error.response?.status)
          console.error('Response data:', error.response?.data)
          console.error('Request URL:', error.config?.url)
          console.error('Full URL:', error.config?.baseURL + error.config?.url)
        }
        throw error
      }
    }

    const generatePayload = async (): Promise<GeneratePayloadResponse> => {
      try {
        console.log('Making request to:', `${API_BASE_URL}/generate-payload`)
        const res = await apiClient.post('/generate-payload')
        console.log('Response status:', res.status)
        console.log('Response data:', res.data)
        
        // Сервер может вернуть либо строку напрямую, либо объект с полем payload
        let payload: string
        if (typeof res.data === 'string') {
          payload = res.data
        } else if (res.data && typeof res.data.payload === 'string') {
          payload = res.data.payload
        } else {
          throw new Error('Payload не найден в ответе сервера. Формат ответа: ' + typeof res.data)
        }
        
        return { payload }
      } catch (error) {
        console.error('Error in generatePayload:', error)
        if (axios.isAxiosError(error)) {
          console.error('Response data:', error.response?.data)
          console.error('Response status:', error.response?.status)
          throw new Error(`Ошибка сервера: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`)
        }
        throw error
      }
    }

    const connectWallet = async (data: ConnectWalletRequestBody): Promise<ConnectWalletResponse> => {
      const res = await apiClient.post<ConnectWalletResponse>('/check-proof', data)
      return res.data
    }

    const disconnectWallet = async (): Promise<void> => {
      await apiClient.post('/wallet/disconnect')
    }

    return { 
      createTransaction,
      generatePayload,
      connectWallet,
      disconnectWallet
    }
  }, [])
}
