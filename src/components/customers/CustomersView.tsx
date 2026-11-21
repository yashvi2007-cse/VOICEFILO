import React, { useState } from 'react';
import {
  Search,
  Plus,
  Phone,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  UserPlus,
  Trash2,
  X
} from 'lucide-react';
import { Customer } from '../../types';

interface CustomersViewProps {
  customers: Customer[];
  onSelectCustomer: (customerId: string) => void;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onQuickTransaction: (customer: Customer, type: 'CREDIT' | 'PAYMENT') => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onSelectCustomer,
  onSaveCustomer,
  onDeleteCustomer,
  onQuickTransaction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DUE' | 'SETTLED'>('ALL');
  const [sortBy, setSortBy] = useState<'BALANCE' | 'NAME' | 'RECENT'>('BALANCE');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [initialBalance, setInitialBalance] = useState('');

  // Filter & Sort
  const filteredCustomers = customers
    .filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (filterType === 'DUE') return c.outstanding_balance > 0;
      if (filterType === 'SETTLED') return c.outstanding_balance <= 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'BALANCE') return b.outstanding_balance - a.outstanding_balance;
      if (sortBy === 'NAME') return a.name.localeCompare(b.name);
      if (sortBy === 'RECENT') {
        const dateA = a.last_transaction_date ? new Date(a.last_transaction_date).getTime() : 0;
        const dateB = b.last_transaction_date ? new Date(b.last_transaction_date).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const parsedInit = parseFloat(initialBalance) || 0;
    const now = new Date().toISOString();

    const newCust: Customer = {
      id: 'cust_' + Date.now(),
      shop_id: 'shop_demo',
      name: newName.trim(),
      normalized_name: newName.trim().toLowerCase(),
      phone: newPhone.trim() || undefined,
      notes: newNotes.trim() || undefined,
      outstanding_balance: parsedInit,
      total_credit: parsedInit > 0 ? parsedInit : 0,
      total_payments: 0,
      transaction_count: parsedInit > 0 ? 1 : 0,
      created_at: now,
      updated_at: now
    };

    onSaveCustomer(newCust);
    setIsAddModalOpen(false);
    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setInitialBalance('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Grahak Khata (Customers)
          </h1>
          <p className="text-sm text-slate-400">
            Total {customers.length} customers registered in your shop
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="py-3 px-5 rounded-2xl font-bold bg-lime-500 text-navy-950 hover:bg-lime-400 active:scale-[0.98] transition-all shadow-lg shadow-lime-500/20 flex items-center justify-center space-x-2"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-navy-950 border border-navy-800 rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-navy-900 border border-navy-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-navy-900">
          {/* Status Filters */}
          <div className="flex items-center space-x-1">
            {[
              { id: 'ALL', label: 'All Customers' },
              { id: 'DUE', label: 'Udhaar Baaki' },
              { id: 'SETTLED', label: 'Hisab Chuka' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as typeof filterType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterType === tab.id
                    ? 'bg-lime-500/20 text-lime-400 border border-lime-500/40'
                    : 'text-slate-400 hover:text-white bg-navy-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-navy-900 border border-navy-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-lime-500"
            >
              <option value="BALANCE">Highest Balance</option>
              <option value="NAME">Name (A-Z)</option>
              <option value="RECENT">Recent Activity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="bg-navy-950 border border-navy-800 hover:border-navy-700 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-extrabold text-white text-lg tracking-tight">{cust.name}</h3>
                  {cust.phone && (
                    <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{cust.phone}</span>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      cust.outstanding_balance > 0
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : cust.outstanding_balance < 0
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        : 'bg-lime-500/10 text-lime-400 border border-lime-500/20'
                    }`}
                  >
                    {cust.outstanding_balance > 0
                      ? 'Udhaar Baaki'
                      : cust.outstanding_balance < 0
                      ? 'Advance Paid'
                      : 'Settled'}
                  </span>
                </div>
              </div>

              {cust.notes && (
                <p className="text-xs text-slate-500 italic mb-4 line-clamp-1">"{cust.notes}"</p>
              )}

              {/* Outstanding Balance */}
              <div className="bg-navy-900/90 rounded-xl p-3 mb-4 border border-navy-800/80">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400 font-medium">Outstanding Udhaar</span>
                  <span
                    className={`text-2xl font-black ${
                      cust.outstanding_balance > 0 ? 'text-amber-400' : 'text-lime-400'
                    }`}
                  >
                    ₹{cust.outstanding_balance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-navy-800">
                  <span>Total Credit: ₹{cust.total_credit}</span>
                  <span>Total Paid: ₹{cust.total_payments}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onQuickTransaction(cust, 'CREDIT')}
                  className="py-2 px-3 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center justify-center space-x-1"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+ Udhaar</span>
                </button>
                <button
                  onClick={() => onQuickTransaction(cust, 'PAYMENT')}
                  className="py-2 px-3 rounded-xl text-xs font-bold bg-lime-500/10 text-lime-400 border border-lime-500/30 hover:bg-lime-500/20 transition-colors flex items-center justify-center space-x-1"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>− Payment</span>
                </button>
              </div>

              <button
                onClick={() => onSelectCustomer(cust.id)}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-navy-800 text-slate-200 hover:text-white hover:bg-navy-700 transition-colors flex items-center justify-center space-x-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>View Full Ledger</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 bg-navy-950 border border-navy-800 rounded-3xl">
          <p className="text-slate-400 text-base font-semibold">No customers found</p>
          <p className="text-xs text-slate-500 mt-1">
            Try a different search or click "Add New Customer" above
          </p>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-navy-900 border border-navy-700 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-navy-800 mb-4">
              <h3 className="text-lg font-bold text-white">Add New Kirana Customer</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar, Sita Devi"
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Initial Outstanding Udhaar (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Notes / Address (Optional)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Near temple, takes daily milk"
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-navy-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-lime-500 text-navy-950 hover:bg-lime-400 transition-colors shadow-lg shadow-lime-500/20"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
