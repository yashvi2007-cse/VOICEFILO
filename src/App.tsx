import React, { useState, useEffect } from 'react';
import { Customer, Transaction, ShopSettings, SyncState } from './types';
import { db } from './lib/storage/db';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { AIDisclosureModal } from './components/common/AIDisclosureModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { VoiceKhataView } from './components/voice/VoiceKhataView';
import { CustomersView } from './components/customers/CustomersView';
import { CustomerLedgerView } from './components/ledger/CustomerLedgerView';
import { TransactionHistoryView } from './components/history/TransactionHistoryView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(db.getSettings());
  const [syncState, setSyncState] = useState<SyncState>('ONLINE');
  const [showDisclosure, setShowDisclosure] = useState<boolean>(false);

  const refreshData = () => {
    setCustomers(db.getCustomers());
    setTransactions(db.getTransactions());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    refreshData();
    const unsub = db.subscribeSync((s) => setSyncState(s));

    // Check if AI disclosure has been seen
    const curSettings = db.getSettings();
    if (!curSettings.ai_disclosure_seen) {
      setShowDisclosure(true);
    }

    return () => unsub();
  }, []);

  const handleAcknowledgeDisclosure = () => {
    const updated = db.saveSettings({ ai_disclosure_seen: true });
    setSettings(updated);
    setShowDisclosure(false);
  };

  const handleTransactionSaved = (tx: Transaction, updatedCust: Customer) => {
    refreshData();
  };

  const handleNavigateToCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveTab('customer_ledger');
  };

  const handleResetDemo = () => {
    if (window.confirm('Reset demo data to default synthetic kirana customers and balances?')) {
      db.resetDemoData();
      refreshData();
      setSelectedCustomerId(null);
      setActiveTab('dashboard');
    }
  };

  const handleUpdateSettings = (newSettings: Partial<ShopSettings>) => {
    const updated = db.saveSettings(newSettings);
    setSettings(updated);
  };

  const stats = db.getDailySummary();
  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId) || null
    : null;

  return (
    <div className="min-h-screen bg-navy-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedCustomerId(null);
          setActiveTab(tab);
        }}
        syncState={syncState}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetDemo={handleResetDemo}
        isSupabase={db.isSupabaseConnected()}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            recentTransactions={transactions}
            onOpenVoice={() => setActiveTab('voice')}
            onNavigateToCustomer={handleNavigateToCustomer}
            onOpenCustomers={() => setActiveTab('customers')}
            onOpenHistory={() => setActiveTab('history')}
            onQuickAction={(action) => {
              if (action === 'ADD_CUSTOMER') {
                setActiveTab('customers');
              } else {
                setActiveTab('voice');
              }
            }}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceKhataView
            customers={customers}
            settings={settings}
            onTransactionSaved={handleTransactionSaved}
            onNavigateToCustomer={handleNavigateToCustomer}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            onSelectCustomer={handleNavigateToCustomer}
            onSaveCustomer={(c) => {
              db.saveCustomer(c);
              refreshData();
            }}
            onDeleteCustomer={(id) => {
              db.deleteCustomer(id);
              refreshData();
            }}
            onQuickTransaction={(c, type) => {
              handleNavigateToCustomer(c.id);
            }}
          />
        )}

        {activeTab === 'customer_ledger' && selectedCustomer && (
          <CustomerLedgerView
            customer={selectedCustomer}
            transactions={transactions}
            onBack={() => {
              setSelectedCustomerId(null);
              setActiveTab('customers');
            }}
            onCustomerUpdated={() => {
              refreshData();
            }}
          />
        )}

        {activeTab === 'history' && (
          <TransactionHistoryView
            transactions={transactions}
            customers={customers}
            onNavigateToCustomer={handleNavigateToCustomer}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            stats={stats}
            customers={customers}
            onNavigateToCustomer={handleNavigateToCustomer}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedCustomerId(null);
          setActiveTab(tab);
        }}
      />

      {/* AI First-Interaction Disclosure Modal */}
      <AIDisclosureModal
        isOpen={showDisclosure}
        onAcknowledge={handleAcknowledgeDisclosure}
        speechEnabled={settings.speech_enabled}
      />
    </div>
  );
};
export default App;
