import React from 'react';
import { LayoutDashboard, Mic, Users, History, BarChart3, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isListening?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  isListening = false
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-navy-950/95 backdrop-blur-lg border-t border-navy-800 pb-safe">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {/* Home / Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            activeTab === 'dashboard' ? 'text-lime-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </button>

        {/* Customers */}
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            activeTab === 'customers' ? 'text-lime-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Customers</span>
        </button>

        {/* Central Floating Voice Button */}
        <div className="flex items-center justify-center -mt-5">
          <button
            onClick={() => setActiveTab('voice')}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              activeTab === 'voice' || isListening
                ? 'bg-lime-500 text-navy-950 shadow-lime-500/40 ring-4 ring-lime-500/20'
                : 'bg-gradient-to-tr from-lime-500 to-teal-400 text-navy-950 shadow-lime-500/30'
            }`}
          >
            <Mic className={`w-7 h-7 ${isListening ? 'animate-bounce' : ''}`} />
          </button>
        </div>

        {/* History */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            activeTab === 'history' ? 'text-lime-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">History</span>
        </button>

        {/* Analytics / Settings */}
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            activeTab === 'analytics' || activeTab === 'settings'
              ? 'text-lime-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Analytics</span>
        </button>
      </div>
    </nav>
  );
};
