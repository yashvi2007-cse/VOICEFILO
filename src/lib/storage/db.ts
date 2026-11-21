import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Customer, Transaction, ShopSettings, SyncState, DailySummaryStats } from '../../types';
import {
  DEMO_SHOP_ID,
  INITIAL_DEMO_CUSTOMERS,
  INITIAL_DEMO_TRANSACTIONS,
  INITIAL_DEMO_SETTINGS
} from './demoData';

const STORAGE_KEYS = {
  CUSTOMERS: 'voicefilo_customers_v1',
  TRANSACTIONS: 'voicefilo_transactions_v1',
  SETTINGS: 'voicefilo_settings_v1',
  SYNC_QUEUE: 'voicefilo_sync_queue_v1'
};

class StorageService {
  private supabase: SupabaseClient | null = null;
  private syncState: SyncState = 'ONLINE';
  private syncListeners: ((state: SyncState) => void)[] = [];

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      } catch (err) {
        console.warn('Supabase initialization failed, running in local-only mode:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setSyncState('ONLINE'));
      window.addEventListener('offline', () => this.setSyncState('OFFLINE'));
      this.syncState = navigator.onLine ? 'ONLINE' : 'OFFLINE';
      this.initDataIfEmpty();
    }
  }

  public subscribeSync(listener: (state: SyncState) => void): () => void {
    this.syncListeners.push(listener);
    listener(this.syncState);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private setSyncState(state: SyncState) {
    this.syncState = state;
    this.syncListeners.forEach(l => l(state));
  }

  public getSyncState(): SyncState {
    return this.syncState;
  }

  public isSupabaseConnected(): boolean {
    return this.supabase !== null;
  }

  private initDataIfEmpty() {
    const customers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!customers) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_DEMO_CUSTOMERS));
    }

    const transactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!transactions) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_DEMO_TRANSACTIONS));
    }

    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_DEMO_SETTINGS));
    }
  }

  // Customers
  public getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return INITIAL_DEMO_CUSTOMERS;
    }
  }

  public getCustomerById(id: string): Customer | null {
    const customers = this.getCustomers();
    return customers.find(c => c.id === id) || null;
  }

  public saveCustomer(customer: Customer): Customer {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.id === customer.id);
    let updated: Customer[];

    if (index >= 0) {
      updated = [...customers];
      updated[index] = { ...customer, updated_at: new Date().toISOString() };
    } else {
      updated = [
        {
          ...customer,
          shop_id: DEMO_SHOP_ID,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        ...customers
      ];
    }

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    return customer;
  }

  public deleteCustomer(id: string): boolean {
    const customers = this.getCustomers().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    return true;
  }

  // Transactions
  public getTransactions(customerId?: string): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const list: Transaction[] = data ? JSON.parse(data) : [];
      if (customerId) {
        return list.filter(t => t.customer_id === customerId);
      }
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return INITIAL_DEMO_TRANSACTIONS;
    }
  }

  public saveTransaction(transaction: Transaction, updatedCustomer?: Customer): Transaction {
    const transactions = this.getTransactions();

    // Prevent duplicate transaction with same idempotency key
    const existing = transactions.find(t => t.idempotency_key === transaction.idempotency_key);
    if (existing) {
      console.warn('Duplicate transaction prevented by idempotency key:', transaction.idempotency_key);
      return existing;
    }

    const updatedTransactions = [transaction, ...transactions];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));

    if (updatedCustomer) {
      this.saveCustomer(updatedCustomer);
    }

    return transaction;
  }

  public updateTransaction(tx: Transaction) {
    const transactions = this.getTransactions();
    const idx = transactions.findIndex(t => t.id === tx.id);
    if (idx >= 0) {
      transactions[idx] = tx;
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }
  }

  // Settings
  public getSettings(): ShopSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : INITIAL_DEMO_SETTINGS;
    } catch {
      return INITIAL_DEMO_SETTINGS;
    }
  }

  public saveSettings(settings: Partial<ShopSettings>): ShopSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  public resetDemoData() {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_DEMO_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_DEMO_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_DEMO_SETTINGS));
  }

  // Analytics & Summary calculations
  public getDailySummary(): DailySummaryStats {
    const today = new Date().toISOString().split('T')[0];
    const transactions = this.getTransactions();
    const customers = this.getCustomers();

    let todayCredit = 0;
    let todayPayment = 0;
    let countToday = 0;

    for (const tx of transactions) {
      if (tx.status === 'REVERSED') continue;
      if (tx.transaction_date === today) {
        countToday++;
        if (tx.type === 'CREDIT') {
          todayCredit += tx.amount;
        } else if (tx.type === 'PAYMENT') {
          todayPayment += tx.amount;
        }
      }
    }

    let totalOutstanding = 0;
    let customersWithBalance = 0;
    for (const c of customers) {
      if (c.outstanding_balance > 0) {
        totalOutstanding += c.outstanding_balance;
        customersWithBalance++;
      }
    }

    // Weekly trend
    const days: { [key: string]: { credit: number; payment: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = { credit: 0, payment: 0 };
    }

    for (const tx of transactions) {
      if (tx.status === 'REVERSED') continue;
      if (days[tx.transaction_date]) {
        if (tx.type === 'CREDIT') days[tx.transaction_date].credit += tx.amount;
        if (tx.type === 'PAYMENT') days[tx.transaction_date].payment += tx.amount;
      }
    }

    const weeklyTrend = Object.keys(days).map(dateKey => {
      const d = new Date(dateKey);
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        credit: days[dateKey].credit,
        payment: days[dateKey].payment
      };
    });

    const topDebtors = [...customers]
      .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
      .slice(0, 5);

    return {
      todayCredit,
      todayPayment,
      totalOutstanding,
      totalCustomers: customers.length,
      customersWithBalance,
      transactionCountToday: countToday,
      weeklyTrend,
      topDebtors
    };
  }

  // Export CSV
  public exportLedgerCSV(): string {
    const transactions = this.getTransactions();
    const headers = ['Transaction ID', 'Date', 'Customer Name', 'Type', 'Amount (INR)', 'Balance After', 'Status', 'Transcript', 'Notes'];
    const rows = transactions.map(t => [
      t.id,
      t.transaction_date,
      `"${t.customer_name || ''}"`,
      t.type,
      t.amount,
      t.balance_after,
      t.status,
      `"${(t.transcript || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csvContent;
  }
}

export const db = new StorageService();
