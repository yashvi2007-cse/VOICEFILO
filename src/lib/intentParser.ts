import { z } from 'zod';
import { Customer, ParsedTransactionIntent, RelativeDate } from '../types';
import { extractRupeeAmount } from './numberParser';
import { matchCustomer } from './customerMatcher';

export const AIIntentSchema = z.object({
  intent: z.enum([
    'ADD_CREDIT',
    'RECORD_PAYMENT',
    'CHECK_BALANCE',
    'DAILY_SUMMARY',
    'CUSTOMER_HISTORY',
    'CORRECT_TRANSACTION',
    'UNKNOWN'
  ]),
  customer_name: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  transaction_direction: z.enum(['CREDIT', 'PAYMENT', 'NONE']),
  transaction_date: z.string().nullable().optional(),
  relative_date: z.enum(['today', 'yesterday', 'day_before_yesterday']).nullable().optional(),
  confidence: z.number().min(0).max(1),
  needs_clarification: z.boolean(),
  clarification_reason: z.string().nullable().optional(),
  correction_amount: z.number().nullable().optional(),
  raw_transcript: z.string(),
  response_text: z.string()
});

/**
 * Resolves relative date expressions into local YYYY-MM-DD
 */
export function resolveRelativeDate(transcript: string): {
  dateStr: string;
  relativeDate: RelativeDate;
} {
  const now = new Date();
  const lower = transcript.toLowerCase();

  if (lower.includes('parso') || lower.includes('day before yesterday')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    return {
      dateStr: d.toISOString().split('T')[0],
      relativeDate: 'day_before_yesterday'
    };
  }

  if (lower.includes('kal') || lower.includes('yesterday') || lower.includes('beete kal')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return {
      dateStr: d.toISOString().split('T')[0],
      relativeDate: 'yesterday'
    };
  }

  return {
    dateStr: now.toISOString().split('T')[0],
    relativeDate: 'today'
  };
}

/**
 * Checks if transcript is a correction statement like "Nahi, 430" or "Actually 450"
 */
export function isCorrectionStatement(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  return (
    /^(nahi|nahin|no|not|actually|galat|change|badlo|sudharo)\b/i.test(lower) ||
    lower.includes(' nahi ') ||
    lower.includes(' not ') ||
    lower.includes('change to') ||
    lower.includes('actually') ||
    lower.includes('galat hai')
  );
}

/**
 * Pure deterministic intent parser for instant, offline, and fallback execution.
 * Guarantees zero AI hallucination for amounts or intents.
 */
export function parseIntentDeterministically(
  transcript: string,
  customers: Customer[]
): ParsedTransactionIntent {
  const cleanTranscript = transcript.trim();
  const lower = cleanTranscript.toLowerCase();
  const { dateStr, relativeDate } = resolveRelativeDate(cleanTranscript);

  // 1. Correction Intent
  if (isCorrectionStatement(cleanTranscript)) {
    const correctedAmount = extractRupeeAmount(cleanTranscript);
    return {
      intent: 'CORRECT_TRANSACTION',
      customer_name: null,
      amount: correctedAmount,
      transaction_direction: 'NONE',
      transaction_date: dateStr,
      relative_date: relativeDate,
      confidence: 0.95,
      needs_clarification: correctedAmount === null,
      clarification_reason: correctedAmount === null ? 'Correction amount could not be recognized.' : null,
      correction_amount: correctedAmount,
      raw_transcript: cleanTranscript,
      response_text: correctedAmount !== null
        ? `Thik hai, ₹${correctedAmount}. Kya ab confirm karun?`
        : 'Amount samajh nahi aaya. Kripya dobara boliye.'
    };
  }

  // 2. Daily Summary Intent
  if (
    lower.includes('aaj kitna') ||
    lower.includes('aaj ka hisaab') ||
    lower.includes('aaj ka hisab') ||
    lower.includes('kitna udhaar gaya') ||
    lower.includes('kitna payment aaya') ||
    lower.includes('daily summary') ||
    lower.includes('collection kitna')
  ) {
    return {
      intent: 'DAILY_SUMMARY',
      customer_name: null,
      amount: null,
      transaction_direction: 'NONE',
      transaction_date: dateStr,
      relative_date: 'today',
      confidence: 0.95,
      needs_clarification: false,
      clarification_reason: null,
      correction_amount: null,
      raw_transcript: cleanTranscript,
      response_text: 'Aaj ka total hisaab check kar raha hoon.'
    };
  }

  // 3. Customer History Intent
  if (
    lower.includes('khata dikhao') ||
    lower.includes('ledger dikhao') ||
    lower.includes('history dikhao') ||
    lower.includes('purana hisaab')
  ) {
    const match = matchCustomer(cleanTranscript, customers);
    return {
      intent: 'CUSTOMER_HISTORY',
      customer_name: match.extractedName,
      matched_customer_id: match.exactMatch?.id || null,
      amount: null,
      transaction_direction: 'NONE',
      transaction_date: null,
      relative_date: null,
      confidence: match.exactMatch ? 0.9 : 0.6,
      needs_clarification: match.isAmbiguous || !match.exactMatch,
      clarification_reason: match.isAmbiguous
        ? `Do ${match.extractedName} hain. Kripya customer chunein.`
        : !match.exactMatch ? 'Customer nahi mila.' : null,
      candidate_customers: match.candidates,
      correction_amount: null,
      raw_transcript: cleanTranscript,
      response_text: match.exactMatch
        ? `${match.exactMatch.name} ka khata khol raha hoon.`
        : 'Customer ka naam spasht nahi hai.'
    };
  }

  // 4. Check Balance Intent
  if (
    lower.includes('kitna baaki') ||
    lower.includes('kitna baki') ||
    lower.includes('kitna baqi') ||
    lower.includes('kitna dena') ||
    lower.includes('kitna lena') ||
    lower.includes('total kitna') ||
    lower.includes('hisaab batao') ||
    lower.includes('balance')
  ) {
    const match = matchCustomer(cleanTranscript, customers);
    return {
      intent: 'CHECK_BALANCE',
      customer_name: match.extractedName,
      matched_customer_id: match.exactMatch?.id || null,
      amount: null,
      transaction_direction: 'NONE',
      transaction_date: null,
      relative_date: null,
      confidence: match.exactMatch ? 0.9 : 0.6,
      needs_clarification: match.isAmbiguous || !match.exactMatch,
      clarification_reason: match.isAmbiguous
        ? `Ek se zyada customer mile: ${match.candidates.map(c => c.name).join(', ')}.`
        : !match.exactMatch ? 'Is naam ka customer nahi mila.' : null,
      candidate_customers: match.candidates,
      correction_amount: null,
      raw_transcript: cleanTranscript,
      response_text: match.exactMatch
        ? `${match.exactMatch.name} ka balance check kar raha hoon.`
        : 'Kiska hisaab check karna hai?'
    };
  }

  // 5. Credit vs Payment Determination
  const extractedAmount = extractRupeeAmount(cleanTranscript);
  const customerMatch = matchCustomer(cleanTranscript, customers);

  const hasCreditKeyword =
    lower.includes('udhaar') ||
    lower.includes('udhar') ||
    lower.includes('khate mein') ||
    lower.includes('jodo') ||
    lower.includes('jod do') ||
    lower.includes('le gaya') ||
    lower.includes('credit');

  const hasPaymentKeyword =
    lower.includes('de diye') ||
    lower.includes('jama') ||
    lower.includes('payment') ||
    lower.includes('chuka') ||
    lower.includes('diye the') ||
    lower.includes('wapas') ||
    lower.includes('paid') ||
    (lower.includes('diye') && !hasCreditKeyword);

  let intent: ParsedTransactionIntent['intent'] = 'UNKNOWN';
  let direction: ParsedTransactionIntent['transaction_direction'] = 'NONE';

  if (hasCreditKeyword) {
    intent = 'ADD_CREDIT';
    direction = 'CREDIT';
  } else if (hasPaymentKeyword) {
    intent = 'RECORD_PAYMENT';
    direction = 'PAYMENT';
  } else if (extractedAmount && customerMatch.exactMatch) {
    // Default to credit if shopkeeper says "Ramesh ka 340"
    intent = 'ADD_CREDIT';
    direction = 'CREDIT';
  }

  const isAmbiguous = customerMatch.isAmbiguous;
  const needsClarification = isAmbiguous || !customerMatch.extractedName || extractedAmount === null;

  let clarificationReason: string | null = null;
  if (isAmbiguous) {
    clarificationReason = `Do ${customerMatch.extractedName} hain. ${customerMatch.candidates.map(c => c.name).join(' ya ')}?`;
  } else if (!customerMatch.extractedName) {
    clarificationReason = 'Customer ka naam samajh nahi aaya.';
  } else if (extractedAmount === null) {
    clarificationReason = 'Amount samajh nahi aaya. Ek baar dobara boliye.';
  }

  let responseText = '';
  if (intent === 'ADD_CREDIT' && extractedAmount && customerMatch.extractedName) {
    responseText = `${customerMatch.extractedName} ke khate mein ₹${extractedAmount} udhaar jod doon?`;
  } else if (intent === 'RECORD_PAYMENT' && extractedAmount && customerMatch.extractedName) {
    responseText = `${customerMatch.extractedName} ka ₹${extractedAmount} payment record kar doon?`;
  } else if (clarificationReason) {
    responseText = clarificationReason;
  } else {
    responseText = 'Main aapka udhaar aur payment record kar sakta hoon. Kripya dobara boliye.';
  }

  return {
    intent,
    customer_name: customerMatch.extractedName,
    matched_customer_id: customerMatch.exactMatch?.id || null,
    amount: extractedAmount,
    transaction_direction: direction,
    transaction_date: dateStr,
    relative_date: relativeDate,
    confidence: customerMatch.exactMatch && extractedAmount ? 0.92 : 0.65,
    needs_clarification: needsClarification,
    clarification_reason: clarificationReason,
    candidate_customers: customerMatch.candidates,
    correction_amount: null,
    raw_transcript: cleanTranscript,
    response_text: responseText
  };
}

/**
 * Parses user speech via server-side Gemini API with seamless local deterministic fallback.
 */
export async function parseTransactionIntent(
  transcript: string,
  customers: Customer[]
): Promise<ParsedTransactionIntent> {
  const fallback = parseIntentDeterministically(transcript, customers);

  // If already identified as a quick local correction or offline, return immediately
  if (fallback.intent === 'CORRECT_TRANSACTION' && fallback.amount !== null) {
    return fallback;
  }

  try {
    const customerNames = customers.map(c => c.name);
    const res = await fetch('/api/parse-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, customerNames })
    });

    if (!res.ok) {
      return fallback;
    }

    const data = await res.json();
    if (data.useDeterministicFallback) {
      return fallback;
    }

    // Validate using Zod schema
    const parseResult = AIIntentSchema.safeParse(data);
    if (!parseResult.success) {
      console.warn('AI Output failed Zod validation, falling back to deterministic parser:', parseResult.error);
      return fallback;
    }

    const aiData = parseResult.data;

    // Deterministic amount sanity check:
    // If AI extracted an amount, verify or refine with deterministic parser
    const deterministicAmount = extractRupeeAmount(transcript);
    const finalAmount = deterministicAmount !== null ? deterministicAmount : aiData.amount || null;

    // Match customer from AI customer_name
    const matched = matchCustomer(aiData.customer_name || transcript, customers);

    return {
      intent: aiData.intent,
      customer_name: matched.extractedName || aiData.customer_name || null,
      matched_customer_id: matched.exactMatch?.id || null,
      amount: finalAmount,
      transaction_direction: aiData.transaction_direction,
      transaction_date: aiData.transaction_date || fallback.transaction_date,
      relative_date: aiData.relative_date || fallback.relative_date,
      confidence: aiData.confidence,
      needs_clarification: matched.isAmbiguous || aiData.needs_clarification || finalAmount === null,
      clarification_reason: matched.isAmbiguous
        ? `Do ${matched.extractedName} hain. ${matched.candidates.map(c => c.name).join(' ya ')}?`
        : aiData.clarification_reason || fallback.clarification_reason,
      candidate_customers: matched.candidates,
      correction_amount: aiData.correction_amount || null,
      raw_transcript: transcript,
      response_text: aiData.response_text || fallback.response_text
    };
  } catch (err) {
    console.warn('Fetch to intent API failed, using deterministic fallback:', err);
    return fallback;
  }
}
