import { describe, it, expect } from 'vitest';
import { extractRupeeAmount } from '../lib/numberParser';
import {
  calculateCustomerBalances,
  validateTransaction,
  createLedgerEntry,
  reverseLedgerEntry,
  generateIdempotencyKey
} from '../lib/ledgerEngine';
import { parseIntentDeterministically } from '../lib/intentParser';
import { matchCustomer } from '../lib/customerMatcher';
import { Customer, Transaction } from '../types';

describe('Indian Amount Normalizer & Parser', () => {
  it('parses standard digits', () => {
    expect(extractRupeeAmount('340')).toBe(340);
    expect(extractRupeeAmount('Ramesh ka 340 udhaar')).toBe(340);
  });

  it('parses comma-separated rupee amounts', () => {
    expect(extractRupeeAmount('1,250')).toBe(1250);
    expect(extractRupeeAmount('₹1,250 de diye')).toBe(1250);
  });

  it('parses Devanagari numerals', () => {
    expect(extractRupeeAmount('३४०')).toBe(340);
    expect(extractRupeeAmount('१२५०')).toBe(1250);
  });

  it('parses Hindi and Hinglish spoken numbers', () => {
    expect(extractRupeeAmount('teen sau chaalis')).toBe(340);
    expect(extractRupeeAmount('teen sau chalis')).toBe(340);
    expect(extractRupeeAmount('teen so chalis')).toBe(340);
    expect(extractRupeeAmount('chaar sau tees')).toBe(430);
    expect(extractRupeeAmount('do hazaar')).toBe(2000);
    expect(extractRupeeAmount('barah sau pachaas')).toBe(1250);
    expect(extractRupeeAmount('paanch sau')).toBe(500);
  });

  it('parses English number words', () => {
    expect(extractRupeeAmount('three hundred forty')).toBe(340);
    expect(extractRupeeAmount('two thousand')).toBe(2000);
  });

  it('parses shorthand multipliers (2k, 1.5k)', () => {
    expect(extractRupeeAmount('2k')).toBe(2000);
    expect(extractRupeeAmount('1.5k')).toBe(1500);
  });

  it('parses correction amounts (Nahi, 430)', () => {
    expect(extractRupeeAmount('Nahi, 430')).toBe(430);
    expect(extractRupeeAmount('340 nahi 430')).toBe(430);
    expect(extractRupeeAmount('Actually 450')).toBe(450);
  });
});

describe('Ledger Engine Calculations & Rules', () => {
  const dummyCustomer: Customer = {
    id: 'cust_1',
    shop_id: 'shop_demo',
    name: 'Ramesh Kumar',
    normalized_name: 'ramesh kumar',
    outstanding_balance: 500,
    total_credit: 500,
    total_payments: 0,
    transaction_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  it('credit adds to balance correctly', () => {
    const { transaction, updatedCustomer } = createLedgerEntry(
      dummyCustomer,
      'CREDIT',
      340,
      '2026-11-21'
    );
    expect(transaction.amount).toBe(340);
    expect(transaction.balance_before).toBe(500);
    expect(transaction.balance_after).toBe(840);
    expect(updatedCustomer.outstanding_balance).toBe(840);
    expect(updatedCustomer.total_credit).toBe(840);
  });

  it('payment subtracts from balance correctly', () => {
    const customerWith840 = { ...dummyCustomer, outstanding_balance: 840 };
    const { transaction, updatedCustomer } = createLedgerEntry(
      customerWith840,
      'PAYMENT',
      200,
      '2026-11-21'
    );
    expect(transaction.balance_before).toBe(840);
    expect(transaction.balance_after).toBe(640);
    expect(updatedCustomer.outstanding_balance).toBe(640);
    expect(updatedCustomer.total_payments).toBe(200);
  });

  it('calculates deterministic balance from transaction list', () => {
    const txs: Transaction[] = [
      {
        id: 'tx1',
        shop_id: 'shop_demo',
        customer_id: 'cust_1',
        type: 'CREDIT',
        amount: 500,
        transaction_date: '2026-11-21',
        created_at: '',
        balance_after: 500,
        status: 'SAVED',
        idempotency_key: 'key1'
      },
      {
        id: 'tx2',
        shop_id: 'shop_demo',
        customer_id: 'cust_1',
        type: 'CREDIT',
        amount: 340,
        transaction_date: '2026-11-21',
        created_at: '',
        balance_after: 840,
        status: 'SAVED',
        idempotency_key: 'key2'
      },
      {
        id: 'tx3',
        shop_id: 'shop_demo',
        customer_id: 'cust_1',
        type: 'PAYMENT',
        amount: 200,
        transaction_date: '2026-11-21',
        created_at: '',
        balance_after: 640,
        status: 'SAVED',
        idempotency_key: 'key3'
      }
    ];

    const { balance, totalCredit, totalPayment } = calculateCustomerBalances(txs);
    expect(totalCredit).toBe(840);
    expect(totalPayment).toBe(200);
    expect(balance).toBe(640);
  });

  it('validates overpayment warning when payment exceeds balance', () => {
    const customerWith100 = { ...dummyCustomer, outstanding_balance: 100 };
    const result = validateTransaction('PAYMENT', 250, customerWith100, false);
    expect(result.isValid).toBe(true);
    expect(result.isAdvancePayment).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('handles transaction reversal properly without silent deletion', () => {
    const customerWith640 = {
      ...dummyCustomer,
      outstanding_balance: 640,
      total_credit: 840,
      total_payments: 200
    };
    const txToReverse: Transaction = {
      id: 'tx_pay_200',
      shop_id: 'shop_demo',
      customer_id: 'cust_1',
      type: 'PAYMENT',
      amount: 200,
      transaction_date: '2026-11-21',
      created_at: '',
      balance_after: 640,
      status: 'SAVED',
      idempotency_key: 'pay_key'
    };

    const { reversalTx, updatedOriginalTx, updatedCustomer } = reverseLedgerEntry(
      txToReverse,
      customerWith640,
      'Customer cancelled note'
    );

    expect(updatedOriginalTx.status).toBe('REVERSED');
    expect(reversalTx.type).toBe('REVERSAL');
    expect(reversalTx.reversal_of).toBe('tx_pay_200');
    // Reversing a 200 payment adds back 200 to outstanding balance
    expect(updatedCustomer.outstanding_balance).toBe(840);
  });

  it('generates consistent idempotency keys to prevent duplicate transactions', () => {
    const key1 = generateIdempotencyKey('cust_1', 'CREDIT', 340, '2026-11-21', 100000);
    const key2 = generateIdempotencyKey('cust_1', 'CREDIT', 340, '2026-11-21', 100000);
    expect(key1).toBe(key2);
  });
});

describe('Customer Matching & Ambiguity Resolution', () => {
  const sampleCustomers: Customer[] = [
    {
      id: 'c1',
      shop_id: 's1',
      name: 'Ramesh Kumar',
      normalized_name: 'ramesh',
      outstanding_balance: 300,
      total_credit: 300,
      total_payments: 0,
      transaction_count: 1,
      created_at: '',
      updated_at: ''
    },
    {
      id: 'c2',
      shop_id: 's1',
      name: 'Ramesh Sharma',
      normalized_name: 'ramesh',
      outstanding_balance: 500,
      total_credit: 500,
      total_payments: 0,
      transaction_count: 1,
      created_at: '',
      updated_at: ''
    },
    {
      id: 'c3',
      shop_id: 's1',
      name: 'Sita Devi',
      normalized_name: 'sita',
      outstanding_balance: 150,
      total_credit: 150,
      total_payments: 0,
      transaction_count: 1,
      created_at: '',
      updated_at: ''
    }
  ];

  it('detects ambiguity between Ramesh Kumar and Ramesh Sharma when only Ramesh is spoken', () => {
    const match = matchCustomer('Ramesh ka 340 udhaar', sampleCustomers);
    expect(match.isAmbiguous).toBe(true);
    expect(match.candidates.length).toBe(2);
    expect(match.exactMatch).toBeNull();
  });

  it('matches exactly when full name Ramesh Kumar is spoken', () => {
    const match = matchCustomer('Ramesh Kumar ka 340 udhaar', sampleCustomers);
    expect(match.isAmbiguous).toBe(false);
    expect(match.exactMatch?.name).toBe('Ramesh Kumar');
  });

  it('matches single customer Sita Devi without ambiguity', () => {
    const match = matchCustomer('Sita ke khate mein 500 jodo', sampleCustomers);
    expect(match.isAmbiguous).toBe(false);
    expect(match.exactMatch?.name).toBe('Sita Devi');
  });
});

describe('Voice Intent Understanding', () => {
  const singleCustomerList: Customer[] = [
    {
      id: 'c1',
      shop_id: 's1',
      name: 'Ramesh',
      normalized_name: 'ramesh',
      outstanding_balance: 300,
      total_credit: 300,
      total_payments: 0,
      transaction_count: 1,
      created_at: '',
      updated_at: ''
    }
  ];

  it('extracts credit intent: "Ramesh ka 340 udhaar."', () => {
    const intent = parseIntentDeterministically('Ramesh ka 340 udhaar.', singleCustomerList);
    expect(intent.intent).toBe('ADD_CREDIT');
    expect(intent.customer_name).toBe('Ramesh');
    expect(intent.amount).toBe(340);
    expect(intent.transaction_direction).toBe('CREDIT');
  });

  it('extracts payment intent: "Ramesh ne 200 diye."', () => {
    const intent = parseIntentDeterministically('Ramesh ne 200 diye.', singleCustomerList);
    expect(intent.intent).toBe('RECORD_PAYMENT');
    expect(intent.customer_name).toBe('Ramesh');
    expect(intent.amount).toBe(200);
    expect(intent.transaction_direction).toBe('PAYMENT');
  });

  it('extracts balance query: "Ramesh ka kitna baaki hai?"', () => {
    const intent = parseIntentDeterministically('Ramesh ka kitna baaki hai?', singleCustomerList);
    expect(intent.intent).toBe('CHECK_BALANCE');
    expect(intent.customer_name).toBe('Ramesh');
  });

  it('extracts daily summary query: "Aaj kitna udhaar gaya?"', () => {
    const intent = parseIntentDeterministically('Aaj kitna udhaar gaya?', singleCustomerList);
    expect(intent.intent).toBe('DAILY_SUMMARY');
  });

  it('extracts spoken correction: "Nahi, 430."', () => {
    const intent = parseIntentDeterministically('Nahi, 430.', singleCustomerList);
    expect(intent.intent).toBe('CORRECT_TRANSACTION');
    expect(intent.correction_amount).toBe(430);
  });
});
