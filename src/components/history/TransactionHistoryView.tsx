import React, { useState } from 'react';
import {
  Search,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Mic,
  Filter,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction, Customer } from '../../types';
import { db } from '../../lib/storage/db';
import { reverseLedgerEntry } from '../../lib/ledgerEngine';
import { speechSynthesizer } from '../../lib/speech/speechSynthesis';

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  customers: Customer[];
  onNavigateToCustomer: (customerId: string) => void;
  onRefreshData: () => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  transactions,
  customers,
  onNavigateToCustomer,
  onRefreshData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'PAYMENT' | 'REVERSAL'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [txToReverse, setTxToReverse] = useState<Transaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const filteredTransactions = transactions.filter((tx) => {
    const custName = tx.customer_name || '';
    const transcript = tx.transcript || '';
    const matchSearch =
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transcript.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.amount.toString().includes(searchTerm);

    if (!matchSearch) return false;
    if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
    if (dateFilter && tx.transaction_date !== dateFilter) return false;

    return true;
  });

  const handleDownloadCSV = () => {
    const csvData = db.exportLedgerCSV();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `voicefilo_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmReversal = () => {
    if (!txToReverse) return;
    const targetCust = customers.find((c) => c.id === txToReverse.customer_id);
    if (!targetCust) return;

    const reason = reversalReason.trim() || 'Reversed from history';
    const { reversalTx, updatedOriginalTx, updatedCustomer } = reverseLedgerEntry(
      txToReverse,
      targetCust,
      reason
    );

    db.updateTransaction(updatedOriginalTx);
    db.saveTransaction(reversalTx, updatedCustomer);
    speechSynthesizer.speak(`Transaction #${txToReverse.id} reverse ho gaya.`);

    setTxToReverse(null);
    setReversalReason('');
    onRefreshData();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Transaction History
          </h1>
          <p className="text-sm text-slate-400">
            Audit trail of all voice & manual entries recorded in VOICEFILO
          </p>
        </div>
        <button
          onClick={handleDownloadCSV}
          className="py-2.5 px-4 rounded-xl font-bold text-xs bg-navy-800 text-slate-200 hover:text-white hover:bg-navy-700 border border-navy-700 transition-colors flex items-center space-x-2"
        >
          <FileSpreadsheet className="w-4 h-4 text-lime-400" />
          <span>Export Excel / CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-navy-950 border border-navy-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, amount, or spoken words..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-lime-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-navy-900">
          <div className="flex items-center space-x-1">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'CREDIT', label: 'Credit (Udhaar)' },
              { id: 'PAYMENT', label: 'Payment (Jama)' },
              { id: 'REVERSAL', label: 'Reversals' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id as typeof typeFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  typeFilter === tab.id
                    ? 'bg-lime-500/20 text-lime-400 border border-lime-500/40'
                    : 'text-slate-400 hover:text-white bg-navy-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-amber-400 hover:underline"
            >
              Clear Date Filter
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table / Cards */}
      <div className="bg-navy-950 border border-navy-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="divide-y divide-navy-800">
          {filteredTransactions.map((tx) => {
            const isCredit = tx.type === 'CREDIT';
            const isPayment = tx.type === 'PAYMENT';
            const isReversal = tx.type === 'REVERSAL';
            const isReversed = tx.status === 'REVERSED';

            return (
              <div
                key={tx.id}
                className={`p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-navy-900/60 transition-colors ${
                  isReversed ? 'opacity-50 bg-navy-950/40' : ''
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`p-2.5 rounded-2xl shrink-0 ${
                      isCredit
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : isPayment
                        ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {isCredit && <ArrowUpRight className="w-5 h-5" />}
                    {isPayment && <ArrowDownLeft className="w-5 h-5" />}
                    {isReversal && <RotateCcw className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onNavigateToCustomer(tx.customer_id)}
                        className="font-bold text-white hover:text-lime-400 text-base transition-colors"
                      >
                        {tx.customer_name || 'Customer'}
                      </button>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isCredit
                            ? 'bg-amber-500/20 text-amber-400'
                            : isPayment
                            ? 'bg-lime-500/20 text-lime-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {tx.type}
                      </span>
                      {isReversed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                          REVERSED
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                      <span>{tx.transaction_date}</span>
                      <span>·</span>
                      <span className="text-slate-500 font-mono text-[11px]">{tx.id}</span>
                      {tx.notes && <span>· {tx.notes}</span>}
                    </p>

                    {tx.transcript && (
                      <div className="mt-1.5 flex items-center space-x-1 text-xs text-slate-300 italic">
                        <Mic className="w-3 h-3 text-lime-400 shrink-0" />
                        <span>"{tx.transcript}"</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-0 border-navy-800 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p
                      className={`text-xl font-black ${
                        isReversed
                          ? 'line-through text-slate-500'
                          : isCredit
                          ? 'text-amber-400'
                          : isPayment
                          ? 'text-lime-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {isCredit ? '+' : isPayment ? '−' : ''}₹{tx.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-slate-400">
                      Balance: <span className="font-bold text-slate-200">₹{tx.balance_after}</span>
                    </p>
                  </div>

                  {!isReversed && !isReversal && (
                    <button
                      onClick={() => setTxToReverse(tx)}
                      className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center space-x-1 mt-1 sm:mt-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reverse Entry</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No transactions match the selected filters.
            </div>
          )}
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      {txToReverse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-navy-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reverse Transaction</h3>
            <p className="text-sm text-slate-300 mb-4">
              Reverse ₹{txToReverse.amount} {txToReverse.type} for{' '}
              <strong>{txToReverse.customer_name}</strong>? An audit reversal entry will be created.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reason for Reversal
              </label>
              <input
                type="text"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Spoken mistake, goods returned"
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setTxToReverse(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-navy-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReversal}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-400"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
