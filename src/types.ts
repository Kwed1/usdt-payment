export interface ClubInfo {
  title?: string;
  short_id?: string | number;
  logo?: string;
}

export interface Contact {
  label: string;
  value?: string;
  link?: string;
}

export interface Sale {
  price_per_chip: number;
  quick_packages: number[];
  allow_custom_amount: boolean;
  min_custom_amount?: number;
  max_custom_amount?: number;
  custom_step?: number;
  custom_message?: string;
}

export interface Preview {
  allowed: boolean;
  reason?: string;
  club?: ClubInfo;
  sale?: Sale;
  member_balance?: number;
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

export type Step = 'form' | 'error' | 'packages' | 'summary' | 'success';


