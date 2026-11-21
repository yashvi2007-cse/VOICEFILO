-- VOICEFILO 1.0 Supabase Database Schema
-- Provides multi-tenant kirana store isolation with Row Level Security (RLS)

-- 1. Shops table
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT,
  preferred_language TEXT DEFAULT 'hinglish',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  outstanding_balance NUMERIC(12, 2) DEFAULT 0.00,
  total_credit NUMERIC(12, 2) DEFAULT 0.00,
  total_payments NUMERIC(12, 2) DEFAULT 0.00,
  last_transaction_date DATE,
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_normalized_name ON public.customers(normalized_name);
CREATE INDEX IF NOT EXISTS idx_customers_balance ON public.customers(outstanding_balance);

-- 3. Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CREDIT', 'PAYMENT', 'REVERSAL')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transcript TEXT,
  balance_before NUMERIC(12, 2),
  balance_after NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'SAVED' CHECK (status IN ('SAVED', 'PENDING_SYNC', 'FAILED', 'REVERSED')),
  idempotency_key TEXT NOT NULL,
  reversal_of UUID REFERENCES public.transactions(id),
  reversal_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_shop_idempotency UNIQUE (shop_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_transactions_shop_date ON public.transactions(shop_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- 4. User Settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  preferred_language TEXT DEFAULT 'hinglish',
  speech_enabled BOOLEAN DEFAULT TRUE,
  speech_rate NUMERIC(3, 2) DEFAULT 1.0,
  speech_pitch NUMERIC(3, 2) DEFAULT 1.0,
  auto_confirm BOOLEAN DEFAULT FALSE,
  require_confirmation BOOLEAN DEFAULT TRUE,
  ai_disclosure_seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Demo or Authenticated Users Policies
CREATE POLICY "Users can only access their own shop" ON public.shops
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access their shop's customers" ON public.customers
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE auth.uid() = id));

CREATE POLICY "Users can only access their shop's transactions" ON public.transactions
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE auth.uid() = id));

CREATE POLICY "Users can only access their shop settings" ON public.user_settings
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE auth.uid() = id));
