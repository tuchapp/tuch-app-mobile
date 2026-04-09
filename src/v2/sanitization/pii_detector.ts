/**
 * PII detector — identifies personally identifiable information in text.
 * All processing is local. If confidence < 0.85, treat as PII to force discard.
 */

export type PIICategory =
  | 'person_name'
  | 'relationship_term'
  | 'company_place'
  | 'date_specific'
  | 'contact_info';

export interface PIIDetectionResult {
  hasPII: boolean;
  categories: PIICategory[];
  confidence: number;
}

// Relationship terms that indicate PII
const RELATIONSHIP_TERMS = [
  'wife', 'husband', 'partner', 'boyfriend', 'girlfriend',
  'boss', 'manager', 'director', 'colleague', 'coworker',
  'daughter', 'son', 'mother', 'father', 'mom', 'dad',
  'sister', 'brother', 'aunt', 'uncle', 'grandmother', 'grandfather',
  'friend', 'mentor', 'therapist', 'doctor',
];

// Day/date patterns indicating specific scheduling PII
const DATE_PATTERNS = [
  /\b(every\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/,
  /\b(this|next|last)\s+(week|month|monday|tuesday|wednesday|thursday|friday)\b/i,
  /\bupcoming\b/i,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN = /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/;

export function detectPII(text: string): PIIDetectionResult {
  const categories: PIICategory[] = [];
  let confidence = 1.0;

  // 1. Person names — capitalized words after "my", "with", "by", "from", etc.
  const personNamePattern = /\b(my|with|by|from|to|called|named|see|met|told)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  if (personNamePattern.test(text)) {
    categories.push('person_name');
  }

  // 2. Relationship terms with possessive context
  const lowerText = text.toLowerCase();
  for (const term of RELATIONSHIP_TERMS) {
    if (new RegExp(`\\bmy\\s+${term}\\b|\\b${term}'s\\b`, 'i').test(lowerText)) {
      if (!categories.includes('relationship_term')) {
        categories.push('relationship_term');
      }
      break;
    }
  }

  // 3. Company/place names — capitalized proper nouns in work/health context
  const companyPlacePattern = /\b(at|in|from|for|with|to)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = companyPlacePattern.exec(text)) !== null) {
    const candidate = m[2];
    // Exclude common sentence starters that aren't proper nouns
    if (!['The', 'A', 'An', 'I', 'My', 'We', 'They', 'He', 'She'].includes(candidate)) {
      if (!categories.includes('company_place')) {
        categories.push('company_place');
      }
      break;
    }
  }

  // 4. Date specifics
  for (const pattern of DATE_PATTERNS) {
    if (pattern.test(text)) {
      if (!categories.includes('date_specific')) {
        categories.push('date_specific');
      }
      break;
    }
  }

  // 5. Contact info
  if (EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text)) {
    categories.push('contact_info');
  }

  const hasPII = categories.length > 0;

  // Reduce confidence if detection is ambiguous (e.g., only date_specific)
  if (hasPII) {
    if (categories.length === 1 && categories[0] === 'date_specific') {
      confidence = 0.75; // Ambiguous — force discard
    } else if (categories.includes('contact_info') || categories.includes('person_name')) {
      confidence = 0.98; // Very high confidence
    } else {
      confidence = 0.90;
    }
  }

  // If confidence < 0.85, force hasPII=true to ensure discard
  if (confidence < 0.85) {
    return { hasPII: true, categories, confidence };
  }

  return { hasPII, categories, confidence };
}
