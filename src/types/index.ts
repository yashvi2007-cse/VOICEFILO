export type TransactionType = 'CREDIT' | 'PAYMENT' | 'REVERSAL';

export type TransactionStatus = 'SAVED' | 'PENDING_SYNC' | 'FAILED' | 'REVERSED';

export type RelativeDate = 'today' | 'yesterday' | 'day_before_yesterday' | null;

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  normalized_name: string;
  phone?: string;
  notes?: string;
  outstanding_balance: number;
  total_credit: number;
  total_payments: number;
  last_transaction_date?: string;
  transaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  shop_id: string;
  customer_id: string;
  customer_name?: string;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  created_at: string;
  transcript?: string;
  balance_after: number;
  balance_before?: number;
  status: TransactionStatus;
  idempotency_key: string;
  reversal_of?: string;
  reversal_reason?: string;
  notes?: string;
}

export type IntentType =
  | 'ADD_CREDIT'
  | 'RECORD_PAYMENT'
  | 'CHECK_BALANCE'
  | 'DAILY_SUMMARY'
  | 'CUSTOMER_HISTORY'
  | 'CORRECT_TRANSACTION'
  | 'UNKNOWN';

export type TransactionDirection = 'CREDIT' | 'PAYMENT' | 'NONE';

export interface ParsedTransactionIntent {
  intent: IntentType;
  customer_name: string | null;
  matched_customer_id?: string | null;
  amount: number | null;
  transaction_direction: TransactionDirection;
  transaction_date: string | null;
  relative_date: RelativeDate;
  confidence: number;
  needs_clarification: boolean;
  clarification_reason: string | null;
  candidate_customers?: Customer[];
  correction_amount: number | null;
  raw_transcript: string;
  response_text: string;
}

export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'UNDERSTANDING'
  | 'CONFIRMATION_REQUIRED'
  | 'TRANSACTION_SAVED'
  | 'ERROR';

export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC_FAILED';

export interface ShopSettings {
  id: string;
  shop_id: string;
  shop_name: string;
  owner_name: string;
  preferred_language: 'hi-IN' | 'en-IN' | 'hinglish';
  speech_enabled: boolean;
  speech_rate: number;
  speech_pitch: number;
  auto_confirm: boolean;
  require_confirmation: boolean;
  ai_disclosure_seen: boolean;
  is_demo_mode: boolean;
}

export interface DailySummaryStats {
  todayCredit: number;
  todayPayment: number;
  totalOutstanding: number;
  totalCustomers: number;
  customersWithBalance: number;
  transactionCountToday: number;
  weeklyTrend: { day: string; credit: number; payment: number }[];
  topDebtors: Customer[];
}
