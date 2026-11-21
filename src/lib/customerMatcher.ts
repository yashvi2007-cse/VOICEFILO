import { Customer } from '../types';

export interface CustomerMatchResult {
  exactMatch: Customer | null;
  candidates: Customer[];
  isAmbiguous: boolean;
  extractedName: string | null;
}

export function normalizeCustomerName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .toLowerCase()
    .replace(/\b(ji|bhai|bhaiya|seth|sethji|chacha|uncle|shree|shri|kumar|devi|lal)\b/gi, '')
    .replace(/[^a-z0-9\s]/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Match spoken name against existing shop customers.
 */
export function matchCustomer(
  spokenNameOrTranscript: string,
  customers: Customer[]
): CustomerMatchResult {
  if (!customers || customers.length === 0) {
    return {
      exactMatch: null,
      candidates: [],
      isAmbiguous: false,
      extractedName: spokenNameOrTranscript ? spokenNameOrTranscript.trim() : null
    };
  }

  const cleanSpoken = spokenNameOrTranscript.trim();
  const lowerSpoken = cleanSpoken.toLowerCase();
  const normalizedSpoken = normalizeCustomerName(cleanSpoken);

  // 1. Direct exact full match against customer name
  const directMatch = customers.find(
    c => c.name.toLowerCase() === lowerSpoken ||
         c.normalized_name.toLowerCase() === normalizedSpoken
  );
  if (directMatch) {
    return {
      exactMatch: directMatch,
      candidates: [directMatch],
      isAmbiguous: false,
      extractedName: directMatch.name
    };
  }

  // 2. Full Name substring match (e.g., "Ramesh Kumar" is inside "Ramesh Kumar ka 340 udhaar")
  const fullNameMatches = customers.filter(c => {
    const custClean = c.name.toLowerCase();
    const regex = new RegExp(`\\b${custClean}\\b`, 'i');
    return regex.test(lowerSpoken);
  });

  if (fullNameMatches.length === 1) {
    return {
      exactMatch: fullNameMatches[0],
      candidates: fullNameMatches,
      isAmbiguous: false,
      extractedName: fullNameMatches[0].name
    };
  }

  if (fullNameMatches.length > 1) {
    return {
      exactMatch: null,
      candidates: fullNameMatches,
      isAmbiguous: true,
      extractedName: fullNameMatches[0].name.split(' ')[0]
    };
  }

  // 3. First-name or nickname match
  const firstNameMatches: Customer[] = [];
  for (const cust of customers) {
    const custFirstWord = cust.name.toLowerCase().split(' ')[0];
    if (custFirstWord.length >= 3) {
      const regex = new RegExp(`\\b${custFirstWord}\\b`, 'i');
      if (regex.test(lowerSpoken) || regex.test(normalizedSpoken)) {
        firstNameMatches.push(cust);
      }
    }
  }

  const uniqueFirstMatches = Array.from(new Set(firstNameMatches));

  if (uniqueFirstMatches.length === 1) {
    return {
      exactMatch: uniqueFirstMatches[0],
      candidates: uniqueFirstMatches,
      isAmbiguous: false,
      extractedName: uniqueFirstMatches[0].name
    };
  }

  if (uniqueFirstMatches.length > 1) {
    return {
      exactMatch: null,
      candidates: uniqueFirstMatches,
      isAmbiguous: true,
      extractedName: uniqueFirstMatches[0].name.split(' ')[0]
    };
  }

  // 4. If no existing customer matched, extract spoken name pattern
  const namePatternMatch = cleanSpoken.match(/^([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)\s+(?:ka|ke|ko|ne)\b/i);
  const potentialName = namePatternMatch ? namePatternMatch[1].trim() : cleanSpoken;

  return {
    exactMatch: null,
    candidates: [],
    isAmbiguous: false,
    extractedName: potentialName
  };
}
