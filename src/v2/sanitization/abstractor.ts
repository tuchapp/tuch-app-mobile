/**
 * Text abstractor — replaces PII with generic domain-tagged placeholders.
 */

import type { PIIDetectionResult, PIICategory } from './pii_detector';

const RELATIONSHIP_MAP: Record<string, string> = {
  wife: 'close_relationship_partner',
  husband: 'close_relationship_partner',
  partner: 'close_relationship_partner',
  boyfriend: 'close_relationship_partner',
  girlfriend: 'close_relationship_partner',
  boss: 'work_relationship_superior',
  manager: 'work_relationship_superior',
  director: 'work_relationship_superior',
  colleague: 'work_relationship_peer',
  coworker: 'work_relationship_peer',
  daughter: 'family_relationship_child',
  son: 'family_relationship_child',
  mother: 'family_relationship_parent',
  father: 'family_relationship_parent',
  mom: 'family_relationship_parent',
  dad: 'family_relationship_parent',
  sister: 'family_relationship_sibling',
  brother: 'family_relationship_sibling',
  friend: 'social_relationship_peer',
  mentor: 'growth_relationship_guide',
  therapist: 'health_relationship_professional',
  doctor: 'health_relationship_professional',
  aunt: 'family_relationship_extended',
  uncle: 'family_relationship_extended',
  grandmother: 'family_relationship_extended',
  grandfather: 'family_relationship_extended',
};

export function abstract(text: string, piiResult: PIIDetectionResult): string {
  let result = text;
  const categories = new Set<PIICategory>(piiResult.categories);

  // Remove contact info first (highest specificity)
  if (categories.has('contact_info')) {
    result = result.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[contact_info]');
    result = result.replace(/(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/g, '[contact_info]');
  }

  // Replace person names (capitalized words after relational prepositions)
  if (categories.has('person_name')) {
    result = result.replace(
      /\b(my|with|by|from|to|called|named|see|met|told)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
      '$1 person_reference'
    );
  }

  // Replace relationship terms
  if (categories.has('relationship_term')) {
    for (const [term, replacement] of Object.entries(RELATIONSHIP_MAP)) {
      result = result.replace(
        new RegExp(`\\bmy\\s+${term}\\b`, 'gi'),
        `my_${replacement}`
      );
      result = result.replace(
        new RegExp(`\\b${term}'s\\b`, 'gi'),
        `${replacement}_possessive`
      );
    }
  }

  // Replace company/place names
  if (categories.has('company_place')) {
    // Work context indicators
    result = result.replace(
      /\b(at|from|for)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/g,
      (match, prep, name) => {
        if (['The', 'A', 'An', 'I', 'My', 'We', 'They'].includes(name)) return match;
        // Heuristic: if preceded by health context words, use health_venue
        if (/\b(doctor|clinic|hospital|gym|yoga|therapy)\b/i.test(result)) {
          return `${prep} health_venue`;
        }
        return `${prep} work_entity`;
      }
    );
  }

  // Replace date specifics
  if (categories.has('date_specific')) {
    result = result.replace(
      /\b(every\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      'recurring_commitment'
    );
    result = result.replace(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi,
      'upcoming_event'
    );
    result = result.replace(
      /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g,
      'upcoming_event'
    );
    result = result.replace(
      /\b(this|next|last)\s+(week|month|monday|tuesday|wednesday|thursday|friday)\b/gi,
      'relative_time_reference'
    );
  }

  return result.trim();
}
