/**
 * Sanitization pipeline — takes raw local memory items and produces
 * safe, anonymized PatternRecords ready for backend sync.
 */

import { detectPII } from './pii_detector';
import { abstract } from './abstractor';
import { classify } from './pattern_classifier';
import type { LocalMemoryItem } from '../db/repositories/memory';
import type { PatternRecord, FeatureItem } from '../api/types';

export function runSanitizationPipeline(
  items: LocalMemoryItem[],
  features: FeatureItem[] = []
): PatternRecord[] {
  const results: PatternRecord[] = [];

  for (const item of items) {
    // Skip private items
    if (item.is_private) continue;

    const text = item.raw_text;

    // Step 1: Detect PII
    const piiResult = detectPII(text);

    // Step 2: If confidence < 0.85 or high-confidence PII, discard
    if (piiResult.hasPII && piiResult.confidence >= 0.85) {
      // Has PII and we're confident — run abstraction
      const abstractedText = abstract(text, piiResult);

      // Step 3: Classify abstracted text
      const pattern = classify(abstractedText, features);

      // Step 4: If no pattern matched, discard
      if (pattern === null) continue;

      results.push(pattern);
    } else if (!piiResult.hasPII) {
      // No PII detected — classify directly
      const pattern = classify(text, features);
      if (pattern === null) continue;
      results.push(pattern);
    }
    // else: hasPII=true but confidence<0.85 — discard (too uncertain to abstract safely)
  }

  return results;
}
