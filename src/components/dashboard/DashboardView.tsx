import React from 'react';
import {
  Mic,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  AlertCircle,
  Plus,
  CreditCard,
  BookOpen,
  ArrowRight,
  Clock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Customer, Transaction, DailySummaryStats } from '../../types';

interface DashboardViewProps {
  stats: DailySummaryStats;
  recentTransactions: Transaction[];
  onOpenVoice: () => void;
  onNavigateToCustomer: (customerId: string) => void;
  onOpenCustomers: () => void;
  onOpenHistory: () => void;
  onQuickAction: (action: 'ADD_CREDIT' | 'RECORD_PAYMENT' | 'ADD_CUSTOMER') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentTransactions,
  onOpenVoice,
  onNavigateToCustomer,
  onOpenCustomers,
  onOpenHistory,
  onQuickAction
}) => {
  const totalVolumeToday = stats.todayCredit + stats.todayPayment;
  const creditPercent = totalVolumeToday > 0 ? (stats.todayCredit / totalVolumeToday) * 100 : 50;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 space-y-6">
      {/* Welcome & Kirana Voice Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border border-lime-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Voice Kirana Khata</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              Boliye, aur khata update kijiye.
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl">
              Typing chhodie. Natural bhasha mein boliye: <span className="text-slate-200">"Ramesh ka 340 udhaar"</span> ya <span className="text-slate-200">"Mohan ne 200 diye"</span>.
            </p>
          </div>

          {/* Central Large Mic Action */}
          <div className="flex flex-col items-center">
            <button
              onClick={onOpenVoice}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-lime-500 via-lime-400 to-teal-400 text-navy-950 flex items-center justify-center shadow-xl shadow-lime-500/30 hover:scale-105 active:scale-95 transition-all ring-8 ring-lime-500/10 group"
            >
              <Mic className="w-10 h-10 md:w-12 md:h-12 group-hover:scale-110 transition-transform" />
            </button>
            <span className="text-xs font-bold text-lime-400 mt-2 uppercase tracking-wider">
              Tap & Speak Now
            </span>
          </div>
        </div>
      </div>

      {/* 5 Summary Metric Cards (Calculated from Actual Ledger) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {/* Total Outstanding Udhaar */}
        <div className="col-span-2 md:col-span-1 bg-navy-950 border border-navy-800 p-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Total Udhaar</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 tracking-tight">
            ₹{stats.totalOutstanding.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Pending from customers</p>
        </div>

        {/* Credit Given Today */}
        <div className="bg-navy-950 border border-navy-800 p-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Aaj Ka Udhaar</span>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            ₹{stats.todayCredit.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-amber-500/90 mt-1">Credit given today</p>
        </div>

        {/* Payments Received Today */}
        <div className="bg-navy-950 border border-navy-800 p-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Aaj Ka Payment</span>
            <ArrowDownLeft className="w-4 h-4 text-lime-400" />
          </div>
          <p className="text-2xl font-black text-lime-400 tracking-tight">
            ₹{stats.todayPayment.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-lime-400/80 mt-1">Cash/UPI collected</p>
        </div>

        {/* Total Customers */}
        <div className="bg-navy-950 border border-navy-800 p-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Total Grahak</span>
            <Users className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">{stats.totalCustomers}</p>
          <p className="text-[11px] text-slate-500 mt-1">Registered customers</p>
        </div>

        {/* Customers with Balance */}
        <div className="bg-navy-950 border border-navy-800 p-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Baki Wale Grahak</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">{stats.customersWithBalance}</p>
          <p className="text-[11px] text-slate-500 mt-1">Have unpaid balance</p>
        </div>
      </div>

      {/* Today's Activity Bar & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Credit vs Payment Bar */}
        <div className="md:col-span-2 bg-navy-950 border border-navy-800 rounded-3xl p-5 md:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Aaj Ka Hisaab (Today's Ratio)</h3>
              <p className="text-xs text-slate-400">Credit given vs collections received</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-300">
                {stats.transactionCountToday} Transactions Today
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-4 w-full bg-navy-800 rounded-full overflow-hidden flex mb-3">
            <div
              style={{ width: `${totalVolumeToday > 0 ? creditPercent : 50}%` }}
              className="bg-amber-500 transition-all duration-500"
              title={`Credit: ₹${stats.todayCredit}`}
            />
            <div
              style={{ width: `${totalVolumeToday > 0 ? 100 - creditPercent : 50}%` }}
              className="bg-lime-500 transition-all duration-500"
              title={`Payment: ₹${stats.todayPayment}`}
            />
          </div>

          <div className="flex justify-between text-xs font-semibold">
            <div className="flex items-center space-x-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Credit (Udhaar): ₹{stats.todayCredit}</span>
            </div>
            <div className="flex items-center space-x-1.5 text-lime-400">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-500" />
              <span>Payment (Jama): ₹{stats.todayPayment}</span>
            </div>
          </div>

          {/* 7-Day Mini Trend */}
          <div className="mt-6 pt-5 border-t border-navy-800">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Last 7 Days Activity
            </p>
            <div className="grid grid-cols-7 gap-2 text-center">
              {stats.weeklyTrend.map((d, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-full h-16 bg-navy-900 rounded-lg flex items-end justify-center p-1 space-x-1">
                    <div
                      style={{ height: `${Math.min(100, (d.credit / (d.credit + d.payment || 1)) * 50)}%` }}
                      className="w-2 bg-amber-500 rounded-t"
                      title={`Credit: ₹${d.credit}`}
                    />
                    <div
                      style={{ height: `${Math.min(100, (d.payment / (d.credit + d.payment || 1)) * 50)}%` }}
                      className="w-2 bg-lime-500 rounded-t"
                      title={`Payment: ₹${d.payment}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium mt-1">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-navy-950 border border-navy-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base mb-1">Quick Actions</h3>
            <p className="text-xs text-slate-400 mb-4">Kirana counter shortcuts</p>
            <div className="space-y-2.5">
              <button
                onClick={() => onQuickAction('ADD_CREDIT')}
                className="w-full p-3 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-800 hover:border-amber-500/40 text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
                    Record Credit (Udhaar)
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => onQuickAction('RECORD_PAYMENT')}
                className="w-full p-3 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-800 hover:border-lime-500/40 text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-lime-500/10 text-lime-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
                    Record Payment (Jama)
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => onQuickAction('ADD_CUSTOMER')}
                className="w-full p-3 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-800 hover:border-teal-500/40 text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
                    Add New Customer
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={onOpenCustomers}
                className="w-full p-3 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-800 hover:border-slate-600 text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
                    View All Ledgers
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Outstanding Customers & Recent Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Outstanding Customers */}
        <div className="bg-navy-950 border border-navy-800 rounded-3xl p-5 md:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Sabse Zyada Udhaar</h3>
              <p className="text-xs text-slate-400">Customers with highest outstanding balance</p>
            </div>
            <button
              onClick={onOpenCustomers}
              className="text-xs font-bold text-lime-400 hover:text-lime-300 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-navy-800">
            {stats.topDebtors.map((c) => (
              <div
                key={c.id}
                onClick={() => onNavigateToCustomer(c.id)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-navy-900/50 px-2 rounded-xl transition-colors"
              >
                <div>
                  <p className="font-bold text-slate-100 text-sm">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.phone || c.notes || 'Kirana regular'}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-amber-400 text-base">₹{c.outstanding_balance}</p>
                  <p className="text-[10px] text-slate-500">Balance</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Transaction Activity */}
        <div className="bg-navy-950 border border-navy-800 rounded-3xl p-5 md:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Recent Transactions</h3>
              <p className="text-xs text-slate-400">Latest voice & manual khata updates</p>
            </div>
            <button
              onClick={onOpenHistory}
              className="text-xs font-bold text-lime-400 hover:text-lime-300 flex items-center space-x-1"
            >
              <span>Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-navy-800">
            {recentTransactions.slice(0, 5).map((t) => (
              <div
                key={t.id}
                onClick={() => onNavigateToCustomer(t.customer_id)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-navy-900/50 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-xl ${
                      t.type === 'CREDIT'
                        ? 'bg-amber-500/10 text-amber-400'
                        : t.type === 'PAYMENT'
                        ? 'bg-lime-500/10 text-lime-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {t.type === 'CREDIT' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-100 text-sm">{t.customer_name || 'Customer'}</p>
                    <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{t.transaction_date}</span>
                      {t.transcript && <span className="italic truncate max-w-[120px]">· "{t.transcript}"</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-black text-base ${
                      t.type === 'CREDIT'
                        ? 'text-amber-400'
                        : t.type === 'PAYMENT'
                        ? 'text-lime-400'
                        : 'text-rose-400 line-through'
                    }`}
                  >
                    {t.type === 'CREDIT' ? '+' : '-'}₹{t.amount}
                  </p>
                  <p className="text-[10px] text-slate-500">Bal: ₹{t.balance_after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
