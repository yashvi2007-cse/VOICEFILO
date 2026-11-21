# VOICEFILO 1.0 — AI Voice Khata for Kirana Stores

> **"The shopkeeper speaks. VOICEFILO understands. The khata updates."**

VOICEFILO 1.0 is an AI-powered voice ledger specifically engineered for Indian kirana shopkeepers. It eliminates manual typing by allowing shopkeepers to record credit (*udhaar*), receive payments (*jama*), check customer balances, ask daily store summaries, and correct mistakes simply by speaking naturally in Hindi, Hinglish, Indian English, or code-mixed dialects.

---

## 🚀 Key Highlights & Architectural Strengths

- **Real Hands-Free Voice Interaction**: Direct integration with the browser's Web Speech Recognition API and SpeechSynthesis API for natural audio responses.
- **Robust Indian Number Normalizer**: Deterministically parses Devanagari digits (`३४०`), spoken Hindi numbers (`"teen sau chaalis"`, `"chaar sau tees"`, `"barah sau pachaas"`, `"do hazaar"`), English numbers (`"three hundred forty"`), shorthand multipliers (`"2k"`, `"1.5k"`), and currency notations (`"₹1,250"`).
- **Conversational Correction Engine**: Supports conversational corrections in the confirmation state (e.g., *"Nahi, 430"*, *"Actually 450"*), safely updating pending transactions without creating duplicate entries.
- **Zero Hallucination Deterministic Ledger Engine**: AI is used solely for natural-language intent extraction. All financial calculations (`Balance = Total Credit − Total Payments`), running balances, and overpayment validations are performed by deterministic code.
- **Smart Customer Disambiguation**: When an ambiguous name is spoken (e.g., *"Ramesh"* when both *Ramesh Kumar* and *Ramesh Sharma* exist), the assistant immediately prompts the shopkeeper with large tap targets and spoken choices instead of guessing.
- **Responsible AI Disclosure**: Complies with AI transparency by politely introducing itself on first launch in Hinglish (*"Namaste! Main VOICEFILO ka AI assistant hoon..."*).
- **Offline Resilience & Cloud Sync**: Built with an offline-first architecture using local persistence and a sync queue. Works 100% out-of-the-box in offline/demo mode, with seamless cloud synchronization via Supabase when configured.
- **Server-Side AI Proxy**: Gemini API requests are handled through a secure backend proxy (`/api/parse-intent`), ensuring `GEMINI_API_KEY` is never exposed in client code. When no API key is set, the built-in deterministic intent engine handles transactions with zero downtime.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **Voice & Audio**: Web Speech API (`SpeechRecognition` & `SpeechSynthesis`), Web Audio API (`AudioContext`, `AnalyserNode` for live sound-wave visualizer)
- **Validation**: Zod schema validation for AI intent payloads
- **Testing**: Vitest automated unit test suite (21 passing tests covering amount normalization, customer matching, ledger calculations, and voice intent extraction)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) policies and offline local storage fallback
- **AI**: Google Gemini API via Vite server proxy, with deterministic fallback

---

## 📱 Application Structure & Pages

1. **Dashboard**: Live financial KPI summary (Total outstanding udhaar, credit given today, payments received today, customer count), central "Tap to Speak" microphone, today's credit vs payment ratio bar, 7-day mini trend, top debtor list, and recent transaction timeline.
2. **Voice Khata**: The core conversational screen featuring real states (`IDLE`, `LISTENING`, `PROCESSING`, `UNDERSTANDING`, `CONFIRMATION_REQUIRED`, `TRANSACTION_SAVED`, `ERROR`), live audio wave visualizer, real-time speech transcript, transaction preview card, correction input, and spoken confirmation.
3. **Customers**: Searchable and filterable directory (All, Udhaar Baaki, Settled), customer cards with quick actions (`+ Udhaar`, `− Payment`, `View Ledger`), and Add/Edit customer modal.
4. **Individual Customer Ledger**: Clean financial statement timeline with color-coded badges (Credit in Amber, Payment in Green, Reversals in Red), audio balance readout, and transaction reversal with reason tracking.
5. **Transaction History**: Searchable audit trail filtered by date, transaction type, or customer, with CSV/Excel export and transaction reversal.
6. **Analytics**: Real-time business metrics including daily collection rate %, lifetime recovery efficiency, weekly trends, and debt concentration breakdown.
7. **Settings**: Shop details, owner name, speech rate and pitch sliders, sound toggle, auto-confirm toggle, privacy disclosure, and synthetic demo data reset.

---

## 🧪 Automated Test Suite

VOICEFILO includes automated unit tests covering all mission-critical logic:

```bash
npm test
```

### Verified Test Categories:
- **Amount Normalization**: Standard digits, commas (`1,250`), Devanagari numerals (`३४०`), Hindi spoken words (`"teen sau chaalis"`, `"chaar sau tees"`), English words (`"three hundred forty"`), multipliers (`"2k"`, `"1.5k"`), and corrections (`"Nahi, 430"`).
- **Ledger Engine**: Balance addition on credit, balance deduction on payment, running balance calculation, overpayment warnings, non-destructive audit reversals, and idempotency key generation to prevent duplicate entries.
- **Customer Matching**: Ambiguity detection (Ramesh Kumar vs Ramesh Sharma), exact match resolution, and single customer resolution (Sita Devi).
- **Voice Intent Extraction**: `ADD_CREDIT`, `RECORD_PAYMENT`, `CHECK_BALANCE`, `DAILY_SUMMARY`, and `CORRECT_TRANSACTION`.

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your Supabase credentials or Gemini API key if desired. Note that VOICEFILO works out-of-the-box in demo mode even without setting any keys!

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 🔒 Security & Privacy by Design

- **Multi-Tenant Isolation**: Row Level Security (RLS) SQL policies ensure shops cannot access another shop's records.
- **Zero Permanent Audio Retention**: Voice speech is streamed locally for recognition and audio is never stored permanently.
- **Auditable Reversals**: Financial mistakes are reversed with clear audit logs rather than silent deletions.
- **Synthetic Data Guarantee**: Hackathon demo mode uses synthetic records clearly labeled with zero real customer PII.
