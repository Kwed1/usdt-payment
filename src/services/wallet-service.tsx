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
      const res = await apiClient.post<ITransactionResponse>('/transaction/', { amount })
      return res.data || { address: "", memo: "" }
    }

    return { createTransaction }
  }, [])
}
