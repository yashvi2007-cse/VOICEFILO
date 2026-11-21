import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  Clock,
  Mic,
  RotateCcw,
  Volume2,
  Share2,
  Calendar,
  AlertTriangle,
  X
} from 'lucide-react';
import { Customer, Transaction } from '../../types';
import { speechSynthesizer } from '../../lib/speech/speechSynthesis';
import { createLedgerEntry, reverseLedgerEntry } from '../../lib/ledgerEngine';
import { db } from '../../lib/storage/db';

interface CustomerLedgerViewProps {
  customer: Customer;
  transactions: Transaction[];
  onBack: () => void;
  onCustomerUpdated: (updatedCustomer: Customer) => void;
}

export const CustomerLedgerView: React.FC<CustomerLedgerViewProps> = ({
  customer,
  transactions,
  onBack,
  onCustomerUpdated
}) => {
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
  const [modalAmount, setModalAmount] = useState('');
  const [modalNotes, setModalNotes] = useState('');

  // Reversal confirmation
  const [txToReverse, setTxToReverse] = useState<Transaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const customerTransactions = transactions.filter((t) => t.customer_id === customer.id);

  const speakCustomerBalance = () => {
    const text = `${customer.name} ka total baki ₹${customer.outstanding_balance} hai. Total udhaar ₹${customer.total_credit} aur total jama ₹${customer.total_payments} hai.`;
    speechSynthesizer.speak(text);
  };

  const handleSaveModalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(modalAmount);
    if (isNaN(amt) || amt <= 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const { transaction, updatedCustomer } = createLedgerEntry(
      customer,
      modalType,
      amt,
      todayStr,
      undefined,
      modalNotes
    );

    db.saveTransaction(transaction, updatedCustomer);
    onCustomerUpdated(updatedCustomer);

    const spokenMsg =
      modalType === 'CREDIT'
        ? `₹${amt} ${updatedCustomer.name} ke khate mein jod diye.`
        : `${updatedCustomer.name} ka ₹${amt} payment record ho gaya.`;
    speechSynthesizer.speak(spokenMsg);

    setIsAddEntryModalOpen(false);
    setModalAmount('');
    setModalNotes('');
  };

  const handleConfirmReversal = () => {
    if (!txToReverse) return;
    const reason = reversalReason.trim() || 'Shopkeeper correction';

    const { reversalTx, updatedOriginalTx, updatedCustomer } = reverseLedgerEntry(
      txToReverse,
      customer,
      reason
    );

    db.updateTransaction(updatedOriginalTx);
    db.saveTransaction(reversalTx, updatedCustomer);
    onCustomerUpdated(updatedCustomer);

    speechSynthesizer.speak(`Transaction reverse ho gaya. Naya balance ₹${updatedCustomer.outstanding_balance} hai.`);

    setTxToReverse(null);
    setReversalReason('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
      {/* Back button & Customer Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-navy-900 border border-navy-800 text-slate-300 hover:text-white hover:bg-navy-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{customer.name}</h1>
          <p className="text-xs text-slate-400">
            {customer.phone ? `Mobile: ${customer.phone}` : 'No phone saved'}
            {customer.notes ? ` · ${customer.notes}` : ''}
          </p>
        </div>
      </div>

      {/* Big Balance & Stats Card */}
      <div className="bg-navy-950 border border-navy-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-1">
              <span>Current Outstanding Udhaar</span>
              <button
                onClick={speakCustomerBalance}
                title="Speak Balance Aloud"
                className="p-1 rounded-full bg-lime-500/20 text-lime-400 hover:bg-lime-500/30 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p
              className={`text-4xl md:text-5xl font-black tracking-tight ${
                customer.outstanding_balance > 0 ? 'text-amber-400' : 'text-lime-400'
              }`}
            >
              ₹{customer.outstanding_balance.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {customer.outstanding_balance > 0
                ? 'Customer needs to pay this amount'
                : customer.outstanding_balance < 0
                ? 'Advance balance held with shop'
                : 'Account settled (No dues)'}
            </p>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setModalType('CREDIT');
                setIsAddEntryModalOpen(true);
              }}
              className="py-3 px-5 rounded-2xl font-bold text-sm bg-amber-500 text-navy-950 hover:bg-amber-400 transition-colors flex items-center space-x-2 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Udhaar (Credit)</span>
            </button>
            <button
              onClick={() => {
                setModalType('PAYMENT');
                setIsAddEntryModalOpen(true);
              }}
              className="py-3 px-5 rounded-2xl font-bold text-sm bg-lime-500 text-navy-950 hover:bg-lime-400 transition-colors flex items-center space-x-2 shadow-lg shadow-lime-500/20"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>− Record Payment (Jama)</span>
            </button>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-navy-800 text-xs">
          <div className="bg-navy-900/80 p-3 rounded-xl border border-navy-800">
            <span className="text-slate-400">Total Credit Given:</span>
            <p className="text-lg font-bold text-slate-200 mt-0.5">₹{customer.total_credit}</p>
          </div>
          <div className="bg-navy-900/80 p-3 rounded-xl border border-navy-800">
            <span className="text-slate-400">Total Payments Received:</span>
            <p className="text-lg font-bold text-slate-200 mt-0.5">₹{customer.total_payments}</p>
          </div>
        </div>
      </div>

      {/* Transaction Timeline */}
      <div className="bg-navy-950 border border-navy-800 rounded-3xl p-5 md:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-navy-800">
          <h2 className="font-extrabold text-white text-lg">Transaction Timeline</h2>
          <span className="text-xs text-slate-400 font-semibold">
            {customerTransactions.length} Transactions
          </span>
        </div>

        <div className="space-y-3">
          {customerTransactions.map((tx) => {
            const isCredit = tx.type === 'CREDIT';
            const isPayment = tx.type === 'PAYMENT';
            const isReversal = tx.type === 'REVERSAL';
            const isReversed = tx.status === 'REVERSED';

            return (
              <div
                key={tx.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isReversed
                    ? 'bg-navy-950/40 border-navy-900 opacity-60'
                    : isCredit
                    ? 'bg-navy-900/80 border-amber-500/20 hover:border-amber-500/40'
                    : isPayment
                    ? 'bg-navy-900/80 border-lime-500/20 hover:border-lime-500/40'
                    : 'bg-navy-900/80 border-rose-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 ${
                        isCredit
                          ? 'bg-amber-500/20 text-amber-400'
                          : isPayment
                          ? 'bg-lime-500/20 text-lime-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {isCredit && <ArrowUpRight className="w-5 h-5" />}
                      {isPayment && <ArrowDownLeft className="w-5 h-5" />}
                      {isReversal && <RotateCcw className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-black text-sm uppercase ${
                            isCredit
                              ? 'text-amber-400'
                              : isPayment
                              ? 'text-lime-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {isCredit ? 'Credit (Udhaar)' : isPayment ? 'Payment (Jama)' : 'Reversal'}
                        </span>
                        {isReversed && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            REVERSED
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{tx.transaction_date}</span>
                        {tx.notes && <span>· {tx.notes}</span>}
                      </p>

                      {tx.transcript && (
                        <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-navy-950 border border-navy-800 text-[11px] text-slate-300">
                          <Mic className="w-3 h-3 text-lime-400" />
                          <span className="italic">"{tx.transcript}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
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
                      {isCredit ? '+' : isPayment ? '−' : ''}₹{tx.amount}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bal after: <span className="font-bold text-slate-200">₹{tx.balance_after}</span>
                    </p>

                    {!isReversed && !isReversal && (
                      <button
                        onClick={() => setTxToReverse(tx)}
                        className="mt-2 text-[11px] text-slate-400 hover:text-rose-400 transition-colors flex items-center space-x-1 ml-auto"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reverse</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {customerTransactions.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              No transactions recorded yet for {customer.name}.
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry Modal */}
      {isAddEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-navy-900 border border-navy-700 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-navy-800 mb-4">
              <h3 className="text-lg font-bold text-white">
                {modalType === 'CREDIT' ? 'Record Credit (Udhaar)' : 'Record Payment (Jama)'}
              </h3>
              <button
                onClick={() => setIsAddEntryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Amount in Rupees (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  autoFocus
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  placeholder="e.g. 340"
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Notes / Samaan Details (Optional)
                </label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Atta 10kg, oil, soap"
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddEntryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-navy-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold text-navy-950 transition-colors shadow-lg ${
                    modalType === 'CREDIT'
                      ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-500/20'
                      : 'bg-lime-500 hover:bg-lime-400 shadow-lime-500/20'
                  }`}
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {txToReverse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-navy-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center space-x-2 text-rose-400 font-bold mb-3">
              <AlertTriangle className="w-5 h-5" />
              <span>Reverse Transaction #{txToReverse.id}</span>
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Are you sure you want to reverse this ₹{txToReverse.amount} {txToReverse.type} entry? This
              will restore {customer.name}'s balance without deleting audit records.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reversal Reason
              </label>
              <input
                type="text"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Wrong amount spoken, goods returned"
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
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-400 transition-colors shadow-lg shadow-rose-500/20"
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
