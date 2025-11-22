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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vowwin-api.webdevops.online'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const useWalletService = () => {
  return useMemo(() => {
    const createTransaction = async (
      amount: number
    ): Promise<ITransactionResponse> => {
      const res = await apiClient.post<ITransactionResponse>('/create-deposit-message', { amount })
      return res.data || { address: "", memo: "" }
    }

    const generatePayload = async (): Promise<GeneratePayloadResponse> => {
      const res = await apiClient.post<GeneratePayloadResponse>('/generate-payload')
      return res.data
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
