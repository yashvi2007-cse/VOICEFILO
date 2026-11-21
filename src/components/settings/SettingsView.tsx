import React from 'react';
import {
  Store,
  User,
  Volume2,
  Globe,
  Sliders,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
  LogOut,
  Info
} from 'lucide-react';
import { ShopSettings } from '../../types';
import { db } from '../../lib/storage/db';
import { speechSynthesizer } from '../../lib/speech/speechSynthesis';

interface SettingsViewProps {
  settings: ShopSettings;
  onUpdateSettings: (newSettings: Partial<ShopSettings>) => void;
  onResetDemo: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetDemo
}) => {
  const handleExportCSV = () => {
    const csvData = db.exportLedgerCSV();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `voicefilo_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const testVoice = () => {
    speechSynthesizer.setRate(settings.speech_rate);
    speechSynthesizer.setPitch(settings.speech_pitch);
    speechSynthesizer.speak('Namaste! VOICEFILO ki voice theek se kaam kar rahi hai.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Shop & Voice Settings
        </h1>
        <p className="text-sm text-slate-400">
          Configure your Kirana store details, voice assistant preferences, and data privacy
        </p>
      </div>

      {/* Shop Information */}
      <div className="bg-navy-950 border border-navy-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
          <Store className="w-5 h-5 text-lime-400" />
          <span>Shop & Kirana Details</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Shop Name</label>
            <input
              type="text"
              value={settings.shop_name}
              onChange={(e) => onUpdateSettings({ shop_name: e.target.value })}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Shopkeeper / Owner Name
            </label>
            <input
              type="text"
              value={settings.owner_name}
              onChange={(e) => onUpdateSettings({ owner_name: e.target.value })}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500"
            />
          </div>
        </div>
      </div>

      {/* Voice Assistant & Speech Settings */}
      <div className="bg-navy-950 border border-navy-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-lime-400" />
            <span>Voice & Speech Assistant</span>
          </h3>
          <button
            onClick={testVoice}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-lime-500/10 text-lime-400 border border-lime-500/30 hover:bg-lime-500/20 transition-colors"
          >
            Test Voice Output
          </button>
        </div>

        {/* Spoken Responses Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-navy-900/80 border border-navy-800">
          <div>
            <p className="font-bold text-white text-sm">Spoken Confirmations (Awaaz Se Batao)</p>
            <p className="text-xs text-slate-400">
              Speak short natural confirmations aloud via phone speaker after transactions
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.speech_enabled}
            onChange={(e) => onUpdateSettings({ speech_enabled: e.target.checked })}
            className="w-5 h-5 accent-lime-500 rounded"
          />
        </div>

        {/* Auto-confirm clear transactions toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-navy-900/80 border border-navy-800">
          <div>
            <p className="font-bold text-white text-sm">Auto-Save Clear Transactions</p>
            <p className="text-xs text-slate-400">
              When disabled (recommended), assistant previews every transaction and asks confirmation
              before saving
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.auto_confirm}
            onChange={(e) => onUpdateSettings({ auto_confirm: e.target.checked })}
            className="w-5 h-5 accent-lime-500 rounded"
          />
        </div>

        {/* Speech Speed & Pitch Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
              <span>Speech Speed: {settings.speech_rate}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={settings.speech_rate}
              onChange={(e) => onUpdateSettings({ speech_rate: parseFloat(e.target.value) })}
              className="w-full accent-lime-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
              <span>Voice Pitch: {settings.speech_pitch}</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={settings.speech_pitch}
              onChange={(e) => onUpdateSettings({ speech_pitch: parseFloat(e.target.value) })}
              className="w-full accent-lime-500"
            />
          </div>
        </div>
      </div>

      {/* Data Management, Export & Demo */}
      <div className="bg-navy-950 border border-navy-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          <span>Data Privacy, Backup & Demo Controls</span>
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-navy-900/80 border border-navy-800">
            <div>
              <p className="font-bold text-white text-sm">Export Full Khata (CSV / Excel)</p>
              <p className="text-xs text-slate-400">Download complete ledger history with timestamps & notes</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="py-2 px-4 rounded-xl text-xs font-bold bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 transition-colors flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-lime-400" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-navy-900/80 border border-navy-800">
            <div>
              <p className="font-bold text-white text-sm">Reset Demo Data (Synthetic Kirana Records)</p>
              <p className="text-xs text-slate-400">
                Restores standard synthetic customers (Ramesh Kumar, Ramesh Sharma, Sita Devi, etc.)
              </p>
            </div>
            <button
              onClick={onResetDemo}
              className="py-2 px-4 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center space-x-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>

        {/* Responsible AI and Security Notice */}
        <div className="p-4 rounded-2xl bg-navy-900/50 border border-navy-800/80 text-xs text-slate-400 space-y-2">
          <p className="font-bold text-slate-200 flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-teal-400" />
            <span>Responsible AI & Data Protection</span>
          </p>
          <p>
            VOICEFILO is designed for Indian kirana privacy. Spoken audio is processed securely and is never stored permanently on remote servers. All financial balance calculations are 100% deterministic code.
          </p>
        </div>
      </div>
    </div>
  );
};
