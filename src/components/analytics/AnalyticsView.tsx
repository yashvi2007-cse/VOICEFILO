import React from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  Calendar,
  Users,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { DailySummaryStats, Customer } from '../../types';

interface AnalyticsViewProps {
  stats: DailySummaryStats;
  customers: Customer[];
  onNavigateToCustomer: (customerId: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats,
  customers,
  onNavigateToCustomer
}) => {
  // Collection rate = (todayPayment / (todayPayment + todayCredit)) * 100
  const totalVolumeToday = stats.todayCredit + stats.todayPayment;
  const collectionRate =
    totalVolumeToday > 0 ? Math.round((stats.todayPayment / totalVolumeToday) * 100) : 100;

  // Calculate total historical shop turnover
  const totalHistoricalCredit = customers.reduce((sum, c) => sum + c.total_credit, 0);
  const totalHistoricalPayment = customers.reduce((sum, c) => sum + c.total_payments, 0);
  const overallCollectionEfficiency =
    totalHistoricalCredit > 0
      ? Math.round((totalHistoricalPayment / totalHistoricalCredit) * 100)
      : 100;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Kirana Analytics
        </h1>
        <p className="text-sm text-slate-400">
          Deterministic business metrics calculated strictly from your ledger records
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-navy-950 border border-navy-800 p-5 rounded-3xl shadow-lg">
          <p className="text-xs text-slate-400 font-semibold mb-1">Today's Collection Rate</p>
          <p className="text-3xl font-black text-lime-400">{collectionRate}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Payment collected vs credit given</p>
        </div>

        <div className="bg-navy-950 border border-navy-800 p-5 rounded-3xl shadow-lg">
          <p className="text-xs text-slate-400 font-semibold mb-1">Total Outstanding Udhaar</p>
          <p className="text-3xl font-black text-amber-400">
            ₹{stats.totalOutstanding.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Across {stats.customersWithBalance} customers</p>
        </div>

        <div className="bg-navy-950 border border-navy-800 p-5 rounded-3xl shadow-lg">
          <p className="text-xs text-slate-400 font-semibold mb-1">Overall Collection Efficiency</p>
          <p className="text-3xl font-black text-teal-400">{overallCollectionEfficiency}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Lifetime total recovery rate</p>
        </div>

        <div className="bg-navy-950 border border-navy-800 p-5 rounded-3xl shadow-lg">
          <p className="text-xs text-slate-400 font-semibold mb-1">Avg Debt per Due Customer</p>
          <p className="text-3xl font-black text-slate-200">
            ₹
            {stats.customersWithBalance > 0
              ? Math.round(stats.totalOutstanding / stats.customersWithBalance).toLocaleString('en-IN')
              : 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Average kirana ticket size</p>
        </div>
      </div>

      {/* Weekly Breakdown Table & Debt Concentration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Card */}
        <div className="bg-navy-950 border border-navy-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-lime-400" />
              <span>Weekly Credit vs Collection</span>
            </h3>
            <span className="text-xs text-slate-400">Last 7 Days</span>
          </div>

          <div className="space-y-3">
            {stats.weeklyTrend.map((item, idx) => (
              <div key={idx} className="bg-navy-900/60 p-3 rounded-2xl border border-navy-800">
                <div className="flex justify-between items-center text-xs font-bold text-white mb-1.5">
                  <span>{item.day}</span>
                  <div className="space-x-3 text-[11px]">
                    <span className="text-amber-400">+₹{item.credit} Credit</span>
                    <span className="text-lime-400">−₹{item.payment} Paid</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-navy-950 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${item.credit + item.payment > 0 ? (item.credit / (item.credit + item.payment)) * 100 : 50}%`
                    }}
                    className="bg-amber-500"
                  />
                  <div
                    style={{
                      width: `${item.credit + item.payment > 0 ? (item.payment / (item.credit + item.payment)) * 100 : 50}%`
                    }}
                    className="bg-lime-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Outstanding Customers */}
        <div className="bg-navy-950 border border-navy-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Top Outstanding Balances</span>
            </h3>
            <span className="text-xs text-slate-400">Concentration</span>
          </div>

          <div className="divide-y divide-navy-800">
            {stats.topDebtors.map((c) => {
              const percentOfTotal =
                stats.totalOutstanding > 0
                  ? Math.round((c.outstanding_balance / stats.totalOutstanding) * 100)
                  : 0;

              return (
                <div
                  key={c.id}
                  onClick={() => onNavigateToCustomer(c.id)}
                  className="py-3.5 flex items-center justify-between hover:bg-navy-900/50 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-bold text-white text-sm">{c.name}</p>
                    <p className="text-xs text-slate-400">
                      {percentOfTotal}% of total store udhaar
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-amber-400 text-base">
                      ₹{c.outstanding_balance.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Paid ₹{c.total_payments} lifetime
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
