import React from 'react';
import { Mic, Volume2, VolumeX, RefreshCw, Wifi, WifiOff, Database } from 'lucide-react';
import { SyncState, ShopSettings } from '../../types';
import { speechSynthesizer } from '../../lib/speech/speechSynthesis';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  syncState: SyncState;
  settings: ShopSettings;
  onUpdateSettings: (newSettings: Partial<ShopSettings>) => void;
  onResetDemo: () => void;
  isSupabase: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  syncState,
  settings,
  onUpdateSettings,
  onResetDemo,
  isSupabase
}) => {
  const toggleSound = () => {
    const nextVal = !settings.speech_enabled;
    speechSynthesizer.setMuted(!nextVal);
    onUpdateSettings({ speech_enabled: nextVal });
  };

  return (
    <header className="sticky top-0 z-40 bg-navy-950/90 backdrop-blur-md border-b border-navy-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lime-500 to-teal-400 p-0.5 shadow-lg shadow-lime-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center">
              <Mic className="w-5 h-5 text-lime-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">VOICEFILO</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold bg-lime-500/20 text-lime-400 border border-lime-500/30">
                1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">AI Voice Khata for Kirana</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'voice', label: 'Voice Khata', highlight: true },
            { id: 'customers', label: 'Customers' },
            { id: 'history', label: 'History' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'settings', label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? tab.highlight
                    ? 'bg-lime-500 text-navy-950 shadow-md shadow-lime-500/20'
                    : 'bg-navy-800 text-white border border-navy-700'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Status Pills & Actions */}
        <div className="flex items-center space-x-2">
          {/* Demo badge & Reset */}
          <div className="flex items-center space-x-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-[11px] font-bold text-amber-400">DEMO</span>
            <button
              onClick={onResetDemo}
              title="Reset Demo Data"
              className="text-amber-400 hover:text-amber-300 p-0.5 rounded ml-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={settings.speech_enabled ? 'Mute Spoken Responses' : 'Enable Spoken Responses'}
            className={`p-2 rounded-lg border transition-colors ${
              settings.speech_enabled
                ? 'bg-navy-800 text-lime-400 border-navy-700 hover:bg-navy-700'
                : 'bg-navy-900 text-slate-500 border-navy-800 hover:text-slate-400'
            }`}
          >
            {settings.speech_enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Online / Sync Status */}
          <div
            title={
              syncState === 'ONLINE'
                ? isSupabase ? 'Cloud Synced via Supabase' : 'Online (Local Storage)'
                : 'Offline Mode Active'
            }
            className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full bg-navy-800 border border-navy-700 text-slate-300"
          >
            {syncState === 'ONLINE' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-lime-400" />
                <span className="hidden sm:inline text-[11px] font-medium text-lime-400">
                  {isSupabase ? 'Cloud' : 'Saved'}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-[11px] font-medium text-amber-400">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
