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
  proof: {
    timestamp: number;
    domain: {
      lengthBytes: number;
      value: string;
    };
    signature: string;
    payload: string;
  };
}

export interface ConnectWalletResponse {
  address: string;
  valid: boolean;
}

export interface ClubBalanceResponse {
  club_id: string;
  club_short_id: number;
  usdt_balance: number;
}

export interface WithdrawRequest {
  amount: number;
}

export interface WithdrawResponse {
  success: boolean;
  message?: string;
}

export interface CreateTransactionRequest {
  account_short_id: number;
  club_short_id: number;
  chips_amount: number;
}

export interface AuthRequest {
  init_data: string;
}

export interface AuthResponse {
  access_token: string;
  role: 'user' | 'admin';
  club_id: number | null;
}

// Хранилище токена
let authToken: string | null = null;

// Функция для установки токена
export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Функция для получения токена
export const getAuthToken = (): string | null => {
  return authToken;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor для автоматической подстановки токена
apiClient.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const useWalletService = () => {
  return useMemo(() => {
    const auth = async (data: AuthRequest): Promise<AuthResponse> => {
      console.log('wallet-service: Calling /auth with data:', { init_data: data.init_data ? 'present' : 'missing' })
      const res = await apiClient.post<AuthResponse>('/auth', data)
      console.log('wallet-service: /auth response:', res.data)
      // Сохраняем токен после успешной авторизации
      if (res.data.access_token) {
        setAuthToken(res.data.access_token)
      }
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
      try {
        console.log('Sending proof to backend:', { address: data.address, hasProof: !!data.proof })
        const res = await apiClient.post<ConnectWalletResponse>('/proof', data)
        console.log('Proof verification response:', res.data)
        
        // Проверяем статус ответа
        if (res.status !== 200) {
          throw new Error('Кошелек не привязался')
        }
        
        if (!res.data.valid) {
          throw new Error('Кошелек не привязался')
        }
        return res.data
      } catch (error) {
        console.error('Error verifying proof:', error)
        if (axios.isAxiosError(error)) {
          console.error('Response status:', error.response?.status)
          console.error('Response data:', error.response?.data)
          // Если статус не 200, выбрасываем ошибку с сообщением о том, что кошелек не привязался
          if (error.response && error.response.status !== 200) {
            throw new Error('Кошелек не привязался')
          }
          throw new Error(error.response?.data?.message || 'Кошелек не привязался')
        }
        throw error
      }
    }

    const disconnectWallet = async (): Promise<void> => {
      await apiClient.post('/wallet/disconnect')
    }

    const getClubBalance = async (clubShortId: number): Promise<number> => {
      const res = await apiClient.get<ClubBalanceResponse>(`/club-balance?club_short_id=${clubShortId}`)
      return Number(res.data.usdt_balance) || 0
    }

    const withdraw = async (data: WithdrawRequest): Promise<WithdrawResponse> => {
      const res = await apiClient.post<WithdrawResponse>('/withdraw', data)
      return res.data
    }

    const getPreview = async (accountShortId: number, clubShortId: number): Promise<any> => {
      const res = await apiClient.get('/preview', {
        params: {
          account_short_id: accountShortId,
          club_short_id: clubShortId,
        }
      })
      return res.data
    }

    return { 
      auth,
      createTransaction,
      generatePayload,
      connectWallet,
      disconnectWallet,
      getClubBalance,
      withdraw,
      getPreview
    }
  }, [])
}
