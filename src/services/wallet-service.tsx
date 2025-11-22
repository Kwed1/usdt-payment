import axios from "axios"
import { useMemo } from "react"
import { API_BASE_URL } from "../config/api.config"

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

export interface ClubBalanceResponse {
  balance: number;
}

export interface WithdrawRequest {
  tg_user_id: number;
  amount: number;
}

export interface WithdrawResponse {
  success: boolean;
  message?: string;
}

export interface CreateTransactionRequest {
  tg_user_id: number;
  account_short_id: number;
  club_short_id: number;
  chips_amount: number;
}

export interface AuthRequest {
  init_data: string;
}

export interface AuthResponse {
  role: 'user' | 'admin';
  club_id: number | null;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const useWalletService = () => {
  return useMemo(() => {
    const auth = async (data: AuthRequest): Promise<AuthResponse> => {
      console.log('wallet-service: Calling /auth with data:', { init_data: data.init_data ? 'present' : 'missing' })
      const res = await apiClient.post<AuthResponse>('/auth', data)
      console.log('wallet-service: /auth response:', res.data)
      return res.data
    }

    const createTransaction = async (
      data: CreateTransactionRequest
    ): Promise<ITransactionResponse> => {
      const res = await apiClient.post<ITransactionResponse>('/deposit-data', data)
      return res.data || { address: "", memo: "" }
    }

    const generatePayload = async (): Promise<string> => {
      const res = await apiClient.post<string>('/generate-payload')
      return res.data
    }

    const connectWallet = async (data: ConnectWalletRequestBody): Promise<ConnectWalletResponse> => {
      const res = await apiClient.post<ConnectWalletResponse>('/proof', data)
      return res.data
    }

    const disconnectWallet = async (): Promise<void> => {
      await apiClient.post('/wallet/disconnect')
    }

    const getClubBalance = async (): Promise<number> => {
      const res = await apiClient.get<ClubBalanceResponse>(`/club-balance`)
      return res.data.balance || 0
    }

    const withdraw = async (data: WithdrawRequest): Promise<WithdrawResponse> => {
      const res = await apiClient.post<WithdrawResponse>('/withdraw', data)
      return res.data
    }

    return { 
      auth,
      createTransaction,
      generatePayload,
      connectWallet,
      disconnectWallet,
      getClubBalance,
      withdraw
    }
  }, [])
}
