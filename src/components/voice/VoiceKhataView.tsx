import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Send,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import {
  Customer,
  ParsedTransactionIntent,
  VoiceState,
  ShopSettings,
  Transaction
} from '../../types';
import {
  speechRecognizer,
  isSpeechRecognitionSupported
} from '../../lib/speech/speechRecognition';
import { speechSynthesizer } from '../../lib/speech/speechSynthesis';
import { audioVisualizer } from '../../lib/speech/audioVisualizer';
import { parseTransactionIntent } from '../../lib/intentParser';
import {
  createLedgerEntry,
  validateTransaction
} from '../../lib/ledgerEngine';
import { db } from '../../lib/storage/db';

interface VoiceKhataViewProps {
  customers: Customer[];
  settings: ShopSettings;
  onTransactionSaved: (tx: Transaction, updatedCustomer: Customer) => void;
  onNavigateToCustomer: (customerId: string) => void;
}

export const VoiceKhataView: React.FC<VoiceKhataViewProps> = ({
  customers,
  settings,
  onTransactionSaved,
  onNavigateToCustomer
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [liveVolume, setLiveVolume] = useState<number>(0);
  const [parsedIntent, setParsedIntent] = useState<ParsedTransactionIntent | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [pendingType, setPendingType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [spokenResponseText, setSpokenResponseText] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>('');
  const [lastSavedTransaction, setLastSavedTransaction] = useState<Transaction | null>(null);
  const [lastSavedCustomer, setLastSavedCustomer] = useState<Customer | null>(null);
  const [allowAdvanceWarningAccepted, setAllowAdvanceWarningAccepted] = useState<boolean>(false);

  const hasNativeSpeech = isSpeechRecognitionSupported();
  const transcriptRef = useRef<string>('');

  // Update language preference on speech recognizer
  useEffect(() => {
    const langCode = settings.preferred_language === 'en-IN' ? 'en-IN' : 'hi-IN';
    speechRecognizer.setLanguage(langCode);
    speechSynthesizer.setRate(settings.speech_rate);
    speechSynthesizer.setPitch(settings.speech_pitch);
  }, [settings]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      speechRecognizer.stop();
      audioVisualizer.stop();
      speechSynthesizer.stop();
    };
  }, []);

  const speakText = (text: string, onEnd?: () => void) => {
    if (!settings.speech_enabled || !text) {
      onEnd?.();
      return;
    }
    setSpokenResponseText(text);
    setIsSpeaking(true);
    speechSynthesizer.speak(text, () => {
      setIsSpeaking(false);
      onEnd?.();
    });
  };

  const handleStartListening = async () => {
    setErrorMessage(null);
    setTranscript('');
    transcriptRef.current = '';
    setParsedIntent(null);
    setSelectedCustomer(null);
    setSelectedAmount(null);
    setVoiceState('LISTENING');

    // Start Web Audio visualizer
    await audioVisualizer.start((vol) => {
      setLiveVolume(vol);
    });

    speechRecognizer.start({
      onStart: () => {
        setVoiceState('LISTENING');
      },
      onResult: (text, isFinal) => {
        setTranscript(text);
        transcriptRef.current = text;
        if (isFinal) {
          // Keep listening for continuous speech until stop
        }
      },
      onError: (err) => {
        audioVisualizer.stop();
        setVoiceState('ERROR');
        setErrorMessage(err);
      },
      onEnd: () => {
        audioVisualizer.stop();
        if (transcriptRef.current.trim().length > 0) {
          processTranscript(transcriptRef.current.trim());
        } else {
          setVoiceState('IDLE');
        }
      }
    });
  };

  const handleStopListening = () => {
    speechRecognizer.stop();
    audioVisualizer.stop();
    if (transcriptRef.current.trim().length > 0) {
      processTranscript(transcriptRef.current.trim());
    } else {
      setVoiceState('IDLE');
    }
  };

  const processTranscript = async (spokenText: string) => {
    setVoiceState('PROCESSING');

    // 1. Check if user is speaking a correction to a currently pending transaction
    if (voiceState === 'CONFIRMATION_REQUIRED' && selectedCustomer) {
      const intentCheck = await parseTransactionIntent(spokenText, customers);
      if (intentCheck.intent === 'CORRECT_TRANSACTION' && intentCheck.correction_amount) {
        setSelectedAmount(intentCheck.correction_amount);
        const reply = `Thik hai, ₹${intentCheck.correction_amount}. Confirm karun?`;
        setSpokenResponseText(reply);
        speakText(reply);
        setVoiceState('CONFIRMATION_REQUIRED');
        return;
      }
    }

    setVoiceState('UNDERSTANDING');
    const result = await parseTransactionIntent(spokenText, customers);
    setParsedIntent(result);

    // Handle Ambiguity
    if (result.needs_clarification && result.candidate_customers && result.candidate_customers.length > 1) {
      setVoiceState('CONFIRMATION_REQUIRED');
      setSelectedCustomer(null);
      setSelectedAmount(result.amount);
      setPendingType(result.transaction_direction === 'PAYMENT' ? 'PAYMENT' : 'CREDIT');
      speakText(result.response_text || `Do ${result.customer_name} hain. Kripya customer chunein.`);
      return;
    }

    // Handle Balance Queries
    if (result.intent === 'CHECK_BALANCE') {
      if (result.matched_customer_id) {
        const cust = customers.find(c => c.id === result.matched_customer_id);
        if (cust) {
          const reply = `${cust.name} ka total baaki ₹${cust.outstanding_balance} hai.`;
          speakText(reply);
          setSpokenResponseText(reply);
          setSelectedCustomer(cust);
          setVoiceState('CONFIRMATION_REQUIRED');
          return;
        }
      }
      speakText('Is naam ka customer nahi mila.');
      setVoiceState('IDLE');
      return;
    }

    // Handle Daily Summary Queries
    if (result.intent === 'DAILY_SUMMARY') {
      const summary = db.getDailySummary();
      const reply = `Aaj ₹${summary.todayCredit} ka udhaar diya aur ₹${summary.todayPayment} payment mila.`;
      speakText(reply);
      setSpokenResponseText(reply);
      setVoiceState('IDLE');
      return;
    }

    // Handle Customer History Queries
    if (result.intent === 'CUSTOMER_HISTORY') {
      if (result.matched_customer_id) {
        speakText(`${result.customer_name} ka khata khol raha hoon.`);
        onNavigateToCustomer(result.matched_customer_id);
        return;
      }
    }

    // Handle Transaction Intents (ADD_CREDIT / RECORD_PAYMENT)
    if (result.amount !== null) {
      setSelectedAmount(result.amount);
      const dir = result.transaction_direction === 'PAYMENT' ? 'PAYMENT' : 'CREDIT';
      setPendingType(dir);

      let matchedCust = result.matched_customer_id
        ? customers.find(c => c.id === result.matched_customer_id) || null
        : null;

      // If no existing customer matched, but name was spoken, we can prepare to add customer
      if (!matchedCust && result.customer_name) {
        matchedCust = {
          id: 'cust_temp_' + Date.now(),
          shop_id: 'shop_demo',
          name: result.customer_name,
          normalized_name: result.customer_name.toLowerCase(),
          outstanding_balance: 0,
          total_credit: 0,
          total_payments: 0,
          transaction_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      setSelectedCustomer(matchedCust);

      if (matchedCust) {
        // Check auto_confirm setting
        if (settings.auto_confirm) {
          confirmAndSaveTransaction(matchedCust, dir, result.amount, spokenText);
          return;
        }

        setVoiceState('CONFIRMATION_REQUIRED');
        const confirmMsg =
          dir === 'CREDIT'
            ? `${matchedCust.name} ke khate mein ₹${result.amount} udhaar jod doon?`
            : `${matchedCust.name} ka ₹${result.amount} payment record kar doon?`;
        speakText(confirmMsg);
      } else {
        setVoiceState('CONFIRMATION_REQUIRED');
        speakText('Customer ka naam samajh nahi aaya. Kripya customer chunein ya banayein.');
      }
    } else {
      // Amount was not recognized
      setVoiceState('ERROR');
      const errTxt = 'Amount samajh nahi aaya. Ek baar dobara boliye.';
      setErrorMessage(errTxt);
      speakText(errTxt);
    }
  };

  const confirmAndSaveTransaction = (
    cust: Customer,
    type: 'CREDIT' | 'PAYMENT',
    amount: number,
    originalTranscript?: string
  ) => {
    const valResult = validateTransaction(type, amount, cust, allowAdvanceWarningAccepted);
    if (!valResult.isValid) {
      setErrorMessage(valResult.error || 'Transaction invalid');
      setVoiceState('ERROR');
      return;
    }

    // If customer is new, ensure it is created first
    if (cust.id.startsWith('cust_temp_')) {
      cust = db.saveCustomer({
        ...cust,
        id: 'cust_' + Date.now()
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const { transaction, updatedCustomer } = createLedgerEntry(
      cust,
      type,
      amount,
      todayStr,
      originalTranscript || transcript
    );

    db.saveTransaction(transaction, updatedCustomer);
    onTransactionSaved(transaction, updatedCustomer);

    setLastSavedTransaction(transaction);
    setLastSavedCustomer(updatedCustomer);
    setVoiceState('TRANSACTION_SAVED');

    const spokenConfirmation =
      type === 'CREDIT'
        ? `₹${amount} ${updatedCustomer.name} ke khate mein jod diye.`
        : `${updatedCustomer.name} ka ₹${amount} payment record ho gaya.`;

    speakText(spokenConfirmation);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const text = manualInput.trim();
    setTranscript(text);
    transcriptRef.current = text;
    setManualInput('');
    processTranscript(text);
  };

  const handleApplyCorrection = (newAmtStr: string) => {
    const amt = parseInt(newAmtStr, 10);
    if (!isNaN(amt) && amt > 0) {
      setSelectedAmount(amt);
      const reply = `Thik hai, ₹${amt}. Confirm karun?`;
      speakText(reply);
    }
  };

  const resetToIdle = () => {
    setVoiceState('IDLE');
    setTranscript('');
    transcriptRef.current = '';
    setParsedIntent(null);
    setSelectedCustomer(null);
    setSelectedAmount(null);
    setErrorMessage(null);
    setLastSavedTransaction(null);
  };

  // Calculate preview balances
  const prevBalance = selectedCustomer ? selectedCustomer.outstanding_balance : 0;
  const currentAmt = selectedAmount || 0;
  const newBalance =
    pendingType === 'CREDIT' ? prevBalance + currentAmt : prevBalance - currentAmt;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Top Banner / Spoken Subtitle */}
      {spokenResponseText && (
        <div className="mb-6 p-4 rounded-2xl bg-navy-800/80 border border-lime-500/30 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl bg-lime-500/20 text-lime-400 ${isSpeaking ? 'animate-pulse' : ''}`}>
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-lime-400/80 font-bold">Voice Assistant</p>
              <p className="text-sm md:text-base font-semibold text-slate-100">{spokenResponseText}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => speechSynthesizer.repeat()}
              title="Repeat Spoken Response"
              className="p-2 rounded-lg bg-navy-700 text-slate-300 hover:text-white hover:bg-navy-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {isSpeaking && (
              <button
                onClick={() => speechSynthesizer.stop()}
                title="Stop Speaking"
                className="px-2.5 py-1 text-xs rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Microphone Card */}
      <div className="bg-navy-950 border border-navy-800 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden shadow-2xl">
        {/* Dynamic Glowing Rings */}
        {voiceState === 'LISTENING' && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transform: `scale(${1 + liveVolume * 0.4})` }}
          >
            <div className="w-64 h-64 rounded-full bg-lime-500/10 animate-ping" />
            <div className="w-48 h-48 rounded-full bg-lime-500/20 animate-pulse" />
          </div>
        )}

        {/* State Label */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-navy-800/80 border border-navy-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <span
            className={`w-2 h-2 rounded-full ${
              voiceState === 'LISTENING'
                ? 'bg-rose-500 animate-pulse'
                : voiceState === 'PROCESSING' || voiceState === 'UNDERSTANDING'
                ? 'bg-amber-400 animate-spin'
                : voiceState === 'TRANSACTION_SAVED'
                ? 'bg-lime-400'
                : 'bg-teal-400'
            }`}
          />
          <span className="text-slate-300">{voiceState.replace('_', ' ')}</span>
        </div>

        {/* Central Mic Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={voiceState === 'LISTENING' ? handleStopListening : handleStartListening}
            className={`w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative ${
              voiceState === 'LISTENING'
                ? 'bg-rose-500 text-white shadow-rose-500/50 ring-8 ring-rose-500/20 scale-105'
                : 'bg-gradient-to-tr from-lime-500 via-lime-400 to-teal-400 text-navy-950 shadow-lime-500/40 hover:scale-105 active:scale-95 ring-8 ring-lime-500/10'
            }`}
          >
            {voiceState === 'LISTENING' ? (
              <MicOff className="w-12 h-12" />
            ) : (
              <Mic className="w-12 h-12" />
            )}
          </button>
        </div>

        {/* Live Audio Volume Wave Bars */}
        {voiceState === 'LISTENING' && (
          <div className="flex items-center justify-center space-x-1.5 h-8 mb-4">
            {[40, 70, 100, 60, 90, 50, 80, 40].map((h, idx) => (
              <div
                key={idx}
                className="w-1.5 rounded-full bg-lime-400 transition-all duration-75"
                style={{
                  height: `${Math.max(6, h * liveVolume * 1.5)}px`
                }}
              />
            ))}
          </div>
        )}

        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-2">
          {voiceState === 'LISTENING'
            ? 'Sun raha hoon... Boliye'
            : voiceState === 'PROCESSING' || voiceState === 'UNDERSTANDING'
            ? 'Samajh raha hoon...'
            : 'Tap Karein Aur Boliye'}
        </h2>
        <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto mb-6">
          {voiceState === 'LISTENING'
            ? 'Bolne ke baad Stop button dabayein ya chup ho jayein'
            : '"Ramesh ka 340 udhaar", "Mohan ne 200 diye", "Sita ka balance"'}
        </p>

        {/* Real-time Voice Transcript */}
        {(transcript || voiceState === 'LISTENING') && (
          <div className="bg-navy-900 border border-navy-700/80 rounded-2xl p-4 text-left mb-6 max-w-lg mx-auto shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span>VOICE TRANSCRIPT</span>
              {voiceState === 'LISTENING' && (
                <span className="text-rose-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  <span>RECORDING</span>
                </span>
              )}
            </div>
            <p className="text-base md:text-lg font-medium text-slate-100 italic">
              "{transcript || '...'}"
            </p>
          </div>
        )}

        {/* Action Controls for Listening */}
        {voiceState === 'LISTENING' && (
          <div className="flex justify-center">
            <button
              onClick={handleStopListening}
              className="px-6 py-3 rounded-xl font-bold bg-navy-800 text-white border border-navy-700 hover:bg-navy-700 transition-colors shadow-lg"
            >
              Done Speaking (Ruk Gaya)
            </button>
          </div>
        )}
      </div>

      {/* Manual Input Fallback & Browser Support Banner */}
      {!hasNativeSpeech && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-300">Speech Recognition Not Supported in this Browser</p>
            <p>
              Your current browser does not support the Web Speech API. For full hands-free voice recognition, open in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>. You can use the manual voice prompt simulator below:
            </p>
          </div>
        </div>
      )}

      {/* Manual Voice Simulator Input (Always Available for Testing / Demos) */}
      <div className="mt-6 bg-navy-900/90 border border-navy-800 rounded-2xl p-4">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Type speech e.g. 'Ramesh ka 340 udhaar' or 'Nahi, 430'"
            className="flex-1 bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-lime-500 text-navy-950 hover:bg-lime-400 transition-colors flex items-center space-x-1.5"
          >
            <span>Process</span>
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Voice Chips */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="text-slate-400 py-1">Try saying:</span>
          {[
            'Ramesh ka 340 udhaar',
            'Mohan ne 200 diye',
            'Sita ke khate mein 500 jodo',
            'Ramesh ka kitna baaki hai?',
            'Aaj kitna udhaar gaya?',
            'Nahi, 430'
          ].map((promptText, i) => (
            <button
              key={i}
              onClick={() => {
                setTranscript(promptText);
                transcriptRef.current = promptText;
                processTranscript(promptText);
              }}
              className="px-2.5 py-1 rounded-lg bg-navy-800 text-slate-300 hover:text-white hover:bg-navy-700 border border-navy-700 transition-colors"
            >
              "{promptText}"
            </button>
          ))}
        </div>
      </div>

      {/* Ambiguous Customer Selection Dialog */}
      {voiceState === 'CONFIRMATION_REQUIRED' &&
        parsedIntent?.candidate_customers &&
        parsedIntent.candidate_customers.length > 1 &&
        !selectedCustomer && (
          <div className="mt-6 bg-navy-950 border border-amber-500/40 rounded-2xl p-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center space-x-2 text-amber-400 font-bold mb-3">
              <AlertCircle className="w-5 h-5" />
              <span>Multiple Customers Match Spoken Name</span>
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Konse <strong>{parsedIntent.customer_name}</strong> ka hisaab hai? Kripya chunein:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {parsedIntent.candidate_customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    const promptText = `${c.name} ke khate mein ₹${selectedAmount} confirm karun?`;
                    speakText(promptText);
                  }}
                  className="p-3.5 rounded-xl bg-navy-900 border border-navy-700 hover:border-lime-500 text-left transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="font-bold text-white group-hover:text-lime-400">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.phone || c.notes || 'No phone'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Current Balance</p>
                    <p className="text-sm font-bold text-amber-400">₹{c.outstanding_balance}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      {/* CONFIRMATION PREVIEW CARD */}
      {voiceState === 'CONFIRMATION_REQUIRED' && selectedCustomer && selectedAmount !== null && (
        <div className="mt-6 bg-navy-950 border border-lime-500/40 rounded-3xl p-6 shadow-2xl relative animate-fadeIn">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-navy-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-lime-400" />
              <h3 className="text-lg font-black text-white">Transaction Preview</h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                pendingType === 'CREDIT'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
              }`}
            >
              {pendingType === 'CREDIT' ? 'UDHAAR (CREDIT)' : 'JAMA (PAYMENT)'}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-navy-900/80 p-3.5 rounded-2xl border border-navy-800">
              <p className="text-xs text-slate-400 font-medium">Customer</p>
              <p className="text-base font-bold text-white truncate">{selectedCustomer.name}</p>
              <p className="text-[11px] text-slate-500">{selectedCustomer.phone || 'Kirana Regular'}</p>
            </div>

            <div className="bg-navy-900/80 p-3.5 rounded-2xl border border-navy-800">
              <p className="text-xs text-slate-400 font-medium">Previous Balance</p>
              <p className="text-base font-bold text-slate-300">₹{prevBalance}</p>
              <p className="text-[11px] text-slate-500">Before transaction</p>
            </div>

            <div className="bg-navy-900/80 p-3.5 rounded-2xl border border-lime-500/20">
              <p className="text-xs text-lime-400 font-bold">New Balance</p>
              <p className="text-xl font-black text-lime-400">₹{newBalance}</p>
              <p className="text-[11px] text-slate-500">After transaction</p>
            </div>
          </div>

          {/* Big Amount Callout */}
          <div className="text-center py-4 bg-navy-900 rounded-2xl border border-navy-800 mb-6">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              {pendingType === 'CREDIT' ? 'Credit Amount to Add' : 'Payment Amount Received'}
            </p>
            <p className={`text-4xl font-extrabold my-1 ${pendingType === 'CREDIT' ? 'text-amber-400' : 'text-lime-400'}`}>
              ₹{selectedAmount}
            </p>
            <p className="text-xs text-slate-500 italic">"{transcript}"</p>
          </div>

          {/* Overpayment Warning if applicable */}
          {pendingType === 'PAYMENT' && selectedAmount > prevBalance && prevBalance > 0 && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span>
                  Payment of ₹{selectedAmount} exceeds current balance of ₹{prevBalance} by ₹{selectedAmount - prevBalance}.
                  This will record an advance balance.
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons: Confirm, Correct, Cancel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Confirm */}
            <button
              onClick={() => {
                confirmAndSaveTransaction(selectedCustomer, pendingType, selectedAmount, transcript);
              }}
              className="py-3.5 px-4 rounded-xl font-extrabold text-sm bg-lime-500 text-navy-950 hover:bg-lime-400 active:scale-[0.98] transition-all shadow-lg shadow-lime-500/20 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirm (Haan, Jodo)</span>
            </button>

            {/* Quick Spoken Correction */}
            <div className="relative flex">
              <input
                type="number"
                placeholder="Nahi, naya amount"
                className="w-full bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyCorrection((e.target as HTMLInputElement).value);
                  }
                }}
              />
            </div>

            {/* Cancel */}
            <button
              onClick={resetToIdle}
              className="py-3.5 px-4 rounded-xl font-bold text-sm bg-navy-800 text-slate-300 hover:text-white hover:bg-navy-700 border border-navy-700 transition-colors"
            >
              Cancel (Radd Karein)
            </button>
          </div>
        </div>
      )}

      {/* TRANSACTION SAVED SUCCESS STATE */}
      {voiceState === 'TRANSACTION_SAVED' && lastSavedTransaction && lastSavedCustomer && (
        <div className="mt-6 bg-navy-950 border border-lime-500/50 rounded-3xl p-6 md:p-8 text-center shadow-2xl animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-lime-500/20 text-lime-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-lime-500/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white mb-1">Khata Update Ho Gaya!</h3>
          <p className="text-sm text-slate-300 mb-6">
            {lastSavedTransaction.type === 'CREDIT' ? 'Udhaar Jod Diya Gaya' : 'Payment Jama Ho Gaya'}
          </p>

          <div className="bg-navy-900/90 rounded-2xl p-4 max-w-sm mx-auto mb-6 border border-navy-800 text-left">
            <div className="flex justify-between py-1 text-sm border-b border-navy-800">
              <span className="text-slate-400">Customer:</span>
              <span className="font-bold text-white">{lastSavedCustomer.name}</span>
            </div>
            <div className="flex justify-between py-1 text-sm border-b border-navy-800">
              <span className="text-slate-400">Amount:</span>
              <span className={`font-bold ${lastSavedTransaction.type === 'CREDIT' ? 'text-amber-400' : 'text-lime-400'}`}>
                {lastSavedTransaction.type === 'CREDIT' ? '+' : '-'}₹{lastSavedTransaction.amount}
              </span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-400">New Total Balance:</span>
              <span className="font-extrabold text-lime-400">₹{lastSavedCustomer.outstanding_balance}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={resetToIdle}
              className="py-3 px-6 rounded-xl font-bold bg-lime-500 text-navy-950 hover:bg-lime-400 transition-colors shadow-lg shadow-lime-500/20 flex items-center justify-center space-x-2"
            >
              <Mic className="w-4 h-4" />
              <span>Next Voice Entry</span>
            </button>
            <button
              onClick={() => onNavigateToCustomer(lastSavedCustomer.id)}
              className="py-3 px-6 rounded-xl font-bold bg-navy-800 text-white hover:bg-navy-700 border border-navy-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>View Customer Ledger</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {voiceState === 'ERROR' && errorMessage && (
        <div className="mt-6 bg-navy-950 border border-rose-500/40 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center space-x-3 mb-3 text-rose-400">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <h4 className="font-bold text-base">Kuch Gadbad Huyi</h4>
          </div>
          <p className="text-sm text-slate-300 mb-4">{errorMessage}</p>
          <div className="flex space-x-3">
            <button
              onClick={handleStartListening}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors"
            >
              Retry Microphone
            </button>
            <button
              onClick={resetToIdle}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-navy-800 text-slate-300 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
