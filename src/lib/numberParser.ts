// VOICEFILO Indian Number Normalizer & Amount Parser
// Normalizes Hindi, Hinglish, Devanagari, and English numerical expressions deterministically.

const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

const HINDI_NUMBER_WORDS: Record<string, number> = {
  'ek': 1, 'do': 2, 'teen': 3, 'tin': 3, 'chaar': 4, 'char': 4, 'paanch': 5, 'panch': 5,
  'chhe': 6, 'che': 6, 'chhah': 6, 'saat': 7, 'aath': 8, 'ath': 8, 'nau': 9, 'no': 9,
  'das': 10, 'dus': 10, 'gyarah': 11, 'gyara': 11, 'barah': 12, 'bara': 12, 'terah': 13, 'tera': 13,
  'chaudah': 14, 'chauda': 14, 'pandrah': 15, 'pandra': 15, 'solah': 16, 'sola': 16,
  'satrah': 17, 'satra': 17, 'atharah': 18, 'athara': 18, 'unnees': 19, 'unnis': 19,
  'bees': 20, 'bis': 20, 'ikkees': 21, 'ikkis': 21, 'baais': 22, 'bais': 22, 'teis': 23, 'tes': 23,
  'chaubees': 24, 'chaubis': 24, 'pachchees': 25, 'pacchis': 25, 'pachis': 25, 'pachees': 25,
  'chhabbees': 26, 'chhabbis': 26, 'sattaais': 27, 'sattais': 27, 'athaais': 28, 'athais': 28,
  'untees': 29, 'untis': 29, 'tees': 30, 'tis': 30, 'iktees': 31, 'iktis': 31, 'battis': 32,
  'tentis': 33, 'taintis': 33, 'chauntis': 34, 'chautis': 34, 'paintis': 35, 'chhattis': 36,
  'saitis': 37, 'adhtis': 38, 'untalis': 39, 'untaalis': 39, 'chaalis': 40, 'chalis': 40,
  'iktalis': 41, 'bayalis': 42, 'taintalis': 43, 'chavalis': 44, 'paintalis': 45, 'chhiyalis': 46,
  'saintalis': 47, 'adhtalis': 48, 'unchaas': 49, 'unchas': 49, 'pachaas': 50, 'pachas': 50,
  'ikyavan': 51, 'baavan': 52, 'tirepan': 53, 'chauvan': 54, 'pachpan': 55, 'chhappan': 56,
  'sattaavan': 57, 'athaavan': 58, 'unsath': 59, 'saath': 60, 'sath': 60, 'iksath': 61,
  'baasath': 62, 'tirsath': 63, 'chausath': 64, 'painsath': 65, 'chhiyasath': 66, 'sadsath': 67,
  'arhsath': 68, 'unhattar': 69, 'sattar': 70, 'ikhattar': 71, 'bahattar': 72, 'tihattar': 73,
  'chauhattar': 74, 'pachhattar': 75, 'chhihattar': 76, 'satattar': 77, 'athattar': 78,
  'unasi': 79, 'assi': 80, 'asi': 80, 'ikyasi': 81, 'bayasi': 82, 'tirasi': 83, 'chaurasi': 84,
  'pachasi': 85, 'chhiyasi': 86, 'satasi': 87, 'athasi': 88, 'nawasi': 89, 'nabbe': 90,
  'nawwe': 90, 'nabbey': 90, 'ikyanve': 91, 'baanve': 92, 'tiranve': 93, 'chauranve': 94,
  'pachanve': 95, 'chhiyanve': 96, 'sattanve': 97, 'athanve': 98, 'ninyanve': 99
};

const ENGLISH_NUMBER_WORDS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
  'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
};

// Convert any Devanagari numerals to Western digits
export function convertDevanagariDigits(text: string): string {
  return text.replace(/[०-९]/g, d => DEVANAGARI_DIGITS[d] || d);
}

// Convert "2k", "1.5k", "2 lakh"
export function parseShortMultiplier(text: string): number | null {
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:k|hazar|hazaar|thousand)\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }
  const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)\b/i);
  if (lakhMatch) {
    return Math.round(parseFloat(lakhMatch[1]) * 100000);
  }
  return null;
}

// Parse written number tokens in Hindi or English
export function parseSpokenNumberSequence(tokens: string[]): number | null {
  let total = 0;
  let currentGroup = 0;
  let hasNumber = false;

  for (let i = 0; i < tokens.length; i++) {
    const rawWord = tokens[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!rawWord) continue;

    // Direct digit
    if (/^\d+$/.test(rawWord)) {
      const val = parseInt(rawWord, 10);
      currentGroup += val;
      hasNumber = true;
      continue;
    }

    // Special Indian idioms
    if (rawWord === 'dedh') { // 1.5
      currentGroup = 1.5;
      hasNumber = true;
      continue;
    }
    if (rawWord === 'dhai') { // 2.5
      currentGroup = 2.5;
      hasNumber = true;
      continue;
    }

    // Check Hindi words
    if (rawWord in HINDI_NUMBER_WORDS) {
      currentGroup += HINDI_NUMBER_WORDS[rawWord];
      hasNumber = true;
      continue;
    }

    // Check English words
    if (rawWord in ENGLISH_NUMBER_WORDS) {
      currentGroup += ENGLISH_NUMBER_WORDS[rawWord];
      hasNumber = true;
      continue;
    }

    // Multipliers
    if (rawWord === 'sau' || rawWord === 'so' || rawWord === 'hundred') {
      currentGroup = (currentGroup === 0 ? 1 : currentGroup) * 100;
      hasNumber = true;
      continue;
    }

    if (rawWord === 'hazaar' || rawWord === 'hazar' || rawWord === 'thousand' || rawWord === 'k') {
      total += (currentGroup === 0 ? 1 : currentGroup) * 1000;
      currentGroup = 0;
      hasNumber = true;
      continue;
    }

    if (rawWord === 'lakh' || rawWord === 'lac') {
      total += (currentGroup === 0 ? 1 : currentGroup) * 100000;
      currentGroup = 0;
      hasNumber = true;
      continue;
    }

    // Non-number word encountered while building number
    if (hasNumber && (rawWord === 'rupaye' || rawWord === 'rupee' || rawWord === 'rupees' || rawWord === 'rs')) {
      continue;
    }
  }

  total += currentGroup;
  return hasNumber ? Math.round(total) : null;
}

/**
 * Main amount extraction function.
 * Deterministically extracts and normalizes rupee amount from any spoken or written text.
 */
export function extractRupeeAmount(input: string): number | null {
  if (!input || typeof input !== 'string') return null;

  // 1. Normalize Devanagari numerals
  let text = convertDevanagariDigits(input.trim());

  // 2. Check for patterns like "340 nahi 430" or "Nahi, 430"
  // If there's an explicit correction pattern, extract the corrected amount
  const correctionMatch = text.match(/(?:nahi|not|change to|actually)\s*[,:]?\s*(?:rs\.?|rupaye|₹)?\s*([0-9,]+)/i);
  if (correctionMatch) {
    const rawVal = correctionMatch[1].replace(/,/g, '');
    const num = parseInt(rawVal, 10);
    if (!isNaN(num) && num > 0) return num;
  }

  // 3. Check for shorthand multipliers like "2k", "1.5k", "2 lakh"
  const shortMult = parseShortMultiplier(text);
  if (shortMult !== null && shortMult > 0) {
    return shortMult;
  }

  // 4. Look for digit matches with optional commas or currency symbols (₹, Rs, Rs., rupaye)
  // e.g. "₹340", "1,250", "340 rupaye", "200 rs"
  const digitRegex = /(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]+)(?:\s*(?:rupaye|rupee|rupees|\/-))?/gi;
  const matches = [...text.matchAll(digitRegex)];
  
  // Find valid positive number in matches
  for (const match of matches) {
    const rawDigits = match[1].replace(/,/g, '');
    const val = parseInt(rawDigits, 10);
    // Ignore stray 1-digit numbers that could be dates or codes unless explicitly marked as rupees
    if (!isNaN(val) && val > 0) {
      // If preceded or followed by currency indicator or is >= 10
      const isExplicitCurrency = /₹|rs|rupaye|rupee|\/-/i.test(match[0]);
      if (val >= 5 || isExplicitCurrency) {
        return val;
      }
    }
  }

  // 5. Look for spoken Hindi / English phrases
  // e.g. "teen sau chaalis", "chaar sau tees", "do hazaar", "barah sau pachaas", "three hundred forty"
  // Break into clean word tokens
  const words = text
    .toLowerCase()
    .replace(/[₹,.-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  // Scan window of tokens to find number sequence
  for (let i = 0; i < words.length; i++) {
    for (let len = Math.min(words.length - i, 6); len >= 1; len--) {
      const slice = words.slice(i, i + len);
      const parsed = parseSpokenNumberSequence(slice);
      if (parsed !== null && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}
