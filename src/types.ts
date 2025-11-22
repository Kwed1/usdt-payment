export interface ClubInfo {
  id?: string;
  title?: string;
  short_id?: string | number;
  logo?: string;
  balance_type?: string;
  contacts?: Contact[];
  union_title?: string;
}

export interface Contact {
  channel?: string;
  label: string;
  value?: string;
  link?: string;
}

export interface Account {
  id?: string;
  short_id?: number;
  nickname?: string;
}

export interface Sale {
  price_per_chip: number;
  currency_code?: string;
  quick_packages: number[];
  allow_custom_amount: boolean;
  min_custom_amount?: number;
  max_custom_amount?: number;
  custom_step?: number;
  custom_message?: string;
}

export interface Preview {
  allowed: boolean;
  reason?: string | null;
  account?: Account | null;
  club?: ClubInfo | null;
  sale?: Sale | null;
  member_balance?: number | null;
}

export interface OwnerClub {
  short_id: number;
  title?: string;
  logo?: string;
}

export interface Payment {
  amount: number;
  account_short_id?: number;
  created_on: string;
}

export interface OwnerStats {
  allowed: boolean;
  reason?: string;
  club_short_id?: number;
  club_title?: string;
  club_logo?: string;
  xtr_balance?: number;
  payments?: Payment[];
}

export type Step = 'form' | 'error' | 'packages' | 'summary' | 'success' | 'withdraw';


