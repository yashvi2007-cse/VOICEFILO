import React from 'react';
import { Bot, ShieldCheck, Volume2, Sparkles } from 'lucide-react';
import { speechSynthesizer } from '../../lib/speech/speechSynthesis';

interface AIDisclosureModalProps {
  isOpen: boolean;
  onAcknowledge: () => void;
  speechEnabled: boolean;
}

export const AIDisclosureModal: React.FC<AIDisclosureModalProps> = ({
  isOpen,
  onAcknowledge,
  speechEnabled
}) => {
  if (!isOpen) return null;

  const handleStart = () => {
    if (speechEnabled) {
      speechSynthesizer.speak(
        'Namaste! Main VOICEFILO ka AI assistant hoon. Main aapka udhaar aur payment record karne mein madad karunga.'
      );
    }
    onAcknowledge();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-navy-900 border border-lime-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-lime-500/20 border border-lime-500/40 flex items-center justify-center text-lime-400">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-lg font-bold text-white">AI Voice Assistant</h3>
              <Sparkles className="w-4 h-4 text-lime-400" />
            </div>
            <p className="text-xs text-slate-400">VOICEFILO 1.0 Responsible AI Disclosure</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-300 bg-navy-950/60 p-4 rounded-xl border border-navy-800">
          <p className="font-medium text-white italic">
            "Namaste! Main VOICEFILO ka AI assistant hoon. Main aapka udhaar aur payment record karne mein madad karunga."
          </p>
          <div className="space-y-2 pt-2 text-xs text-slate-400 border-t border-navy-800">
            <div className="flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Hallucination:</strong> Ledger calculations & balances are performed by deterministic financial math, never calculated by AI.
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <Volume2 className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
              <span>
                <strong>Spoken Feedback:</strong> The assistant will confirm transactions aloud. You can mute or change voice speed anytime in settings.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleStart}
            className="w-full py-3 px-4 rounded-xl font-bold bg-lime-500 text-navy-950 hover:bg-lime-400 active:scale-[0.99] transition-all shadow-lg shadow-lime-500/20 text-center"
          >
            Shuru Karein (Get Started)
          </button>
        </div>
      </div>
    </div>
  );
};
