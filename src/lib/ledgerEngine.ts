import { Customer, Transaction, TransactionType } from '../types';

export interface LedgerValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  isAdvancePayment?: boolean;
}

/**
 * Computes deterministic customer balance from transaction history.
 * Balance = Total CREDIT - Total PAYMENT.
 * Reversals cancel out their referenced transactions.
 */
export function calculateCustomerBalances(transactions: Transaction[]): {
  balance: number;
  totalCredit: number;
  totalPayment: number;
} {
  let totalCredit = 0;
  let totalPayment = 0;

  // Track reversed transaction IDs
  const reversedIds = new Set<string>();
  for (const t of transactions) {
    if (t.type === 'REVERSAL' && t.reversal_of) {
      reversedIds.add(t.reversal_of);
    }
    if (t.status === 'REVERSED') {
      reversedIds.add(t.id);
    }
  }

  for (const tx of transactions) {
    if (reversedIds.has(tx.id)) {
      continue; // Skip reversed transactions
    }
    if (tx.type === 'CREDIT' && tx.status !== 'FAILED') {
      totalCredit += tx.amount;
    } else if (tx.type === 'PAYMENT' && tx.status !== 'FAILED') {
      totalPayment += tx.amount;
    }
  }

  const balance = totalCredit - totalPayment;
  return { balance, totalCredit, totalPayment };
}

/**
 * Validates a pending transaction against customer ledger rules.
 */
export function validateTransaction(
  type: TransactionType,
  amount: number,
  customer: Customer | null,
  allowAdvance: boolean = false
): LedgerValidationResult {
  if (!customer) {
    return { isValid: false, error: 'Customer is required to record a transaction.' };
  }

  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than zero.' };
  }

  if (amount > 1000000) {
    return { isValid: false, error: 'Amount exceeds maximum kirana single transaction limit (₹10,00,000).' };
  }

  if (type === 'PAYMENT') {
    const currentBalance = customer.outstanding_balance;
    if (amount > currentBalance && currentBalance > 0 && !allowAdvance) {
      const excess = amount - currentBalance;
      return {
        isValid: true,
        warning: `Payment (₹${amount}) exceeds outstanding balance (₹${currentBalance}) by ₹${excess}. This will create an advance payment balance.`,
        isAdvancePayment: true
      };
    }
  }

  return { isValid: true };
}

/**
 * Generates an idempotency key to prevent accidental duplicate submission.
 */
export function generateIdempotencyKey(
  customerId: string,
  type: TransactionType,
  amount: number,
  date: string,
  timestampMs?: number
): string {
  // Use a 30-second deduplication window if timestamp is provided
  const windowSlice = timestampMs ? Math.floor(timestampMs / 30000) : 0;
  return `${customerId}_${type}_${amount}_${date}_${windowSlice}`;
}

/**
 * Creates a new transaction with calculated before & after balances.
 */
export function createLedgerEntry(
  customer: Customer,
  type: TransactionType,
  amount: number,
  date: string,
  transcript?: string,
  notes?: string
): { transaction: Transaction; updatedCustomer: Customer } {
  const currentBalance = customer.outstanding_balance;
  let newBalance = currentBalance;

  if (type === 'CREDIT') {
    newBalance = currentBalance + amount;
  } else if (type === 'PAYMENT') {
    newBalance = currentBalance - amount;
  }

  const now = new Date().toISOString();
  const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const idempotency = generateIdempotencyKey(customer.id, type, amount, date, Date.now());

  const transaction: Transaction = {
    id: txId,
    shop_id: customer.shop_id,
    customer_id: customer.id,
    customer_name: customer.name,
    type,
    amount,
    transaction_date: date,
    created_at: now,
    transcript: transcript || '',
    balance_before: currentBalance,
    balance_after: newBalance,
    status: 'SAVED',
    idempotency_key: idempotency,
    notes: notes || ''
  };

  const updatedCustomer: Customer = {
    ...customer,
    outstanding_balance: newBalance,
    total_credit: type === 'CREDIT' ? customer.total_credit + amount : customer.total_credit,
    total_payments: type === 'PAYMENT' ? customer.total_payments + amount : customer.total_payments,
    last_transaction_date: date,
    transaction_count: customer.transaction_count + 1,
    updated_at: now
  };

  return { transaction, updatedCustomer };
}

/**
 * Reverses a transaction safely and creates an audit reversal record.
 */
export function reverseLedgerEntry(
  originalTx: Transaction,
  customer: Customer,
  reason: string
): { reversalTx: Transaction; updatedOriginalTx: Transaction; updatedCustomer: Customer } {
  const now = new Date().toISOString();
  const reversalId = 'rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  let newBalance = customer.outstanding_balance;
  let newCredit = customer.total_credit;
  let newPayment = customer.total_payments;

  if (originalTx.type === 'CREDIT') {
    newBalance -= originalTx.amount;
    newCredit -= originalTx.amount;
  } else if (originalTx.type === 'PAYMENT') {
    newBalance += originalTx.amount;
    newPayment -= originalTx.amount;
  }

  const updatedOriginalTx: Transaction = {
    ...originalTx,
    status: 'REVERSED',
    notes: originalTx.notes ? `${originalTx.notes} (Reversed: ${reason})` : `Reversed: ${reason}`
  };

  const reversalTx: Transaction = {
    id: reversalId,
    shop_id: customer.shop_id,
    customer_id: customer.id,
    customer_name: customer.name,
    type: 'REVERSAL',
    amount: originalTx.amount,
    transaction_date: new Date().toISOString().split('T')[0],
    created_at: now,
    transcript: `Reversal of #${originalTx.id}: ${reason}`,
    balance_before: customer.outstanding_balance,
    balance_after: newBalance,
    status: 'SAVED',
    idempotency_key: `reversal_${originalTx.id}`,
    reversal_of: originalTx.id,
    reversal_reason: reason
  };

  const updatedCustomer: Customer = {
    ...customer,
    outstanding_balance: newBalance,
    total_credit: newCredit,
    total_payments: newPayment,
    updated_at: now
  };

  return { reversalTx, updatedOriginalTx, updatedCustomer };
}
