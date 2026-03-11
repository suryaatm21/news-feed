import { getStalenessCutoff } from './date';
import type { Headline } from '../types';

function normalizeToken(token: string): string {
  return token.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 2);
}

function titleSignature(title: string): string {
  return tokenize(title)
    .slice(0, 10)
    .join(' ');
}

function jaccard(a: string[], b: string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  const intersection = [...left].filter((token) => right.has(token));
  const union = new Set([...left, ...right]);
  return union.size === 0 ? 0 : intersection.length / union.size;
}

function publishedTimestamp(item: Headline): number {
  if (!item.publishedAt) {
    return 0;
  }

  const timestamp = Date.parse(item.publishedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function filterFreshHeadlines(headlines: Headline[], now: Date): Headline[] {
  const cutoff = getStalenessCutoff(now);
  return headlines.filter((headline) => {
    if (!headline.publishedAt) {
      return true;
    }
    const published = Date.parse(headline.publishedAt);
    return Number.isNaN(published) ? true : published >= cutoff;
  });
}

export function selectDiverseHeadlines(headlines: Headline[], min = 5, max = 6): Headline[] {
  const sorted = [...headlines].sort((left, right) => publishedTimestamp(right) - publishedTimestamp(left));
  const selected: Headline[] = [];
  const seenSignatures = new Set<string>();

  for (const headline of sorted) {
    const signature = titleSignature(headline.title);
    if (seenSignatures.has(signature)) {
      continue;
    }

    const tokens = tokenize(headline.title);
    const isNearDuplicate = selected.some((current) => {
      const similarity = jaccard(tokens, tokenize(current.title));
      return similarity >= 0.7;
    });

    if (isNearDuplicate) {
      continue;
    }

    selected.push(headline);
    seenSignatures.add(signature);

    if (selected.length === max) {
      break;
    }
  }

  if (selected.length >= min) {
    return selected;
  }

  return sorted.slice(0, Math.min(sorted.length, max));
}

export function uniqueSources(headlines: Headline[]): Array<{ id: string; name: string; siteUrl: string }> {
  const seen = new Map<string, { id: string; name: string; siteUrl: string }>();
  for (const headline of headlines) {
    if (!seen.has(headline.sourceId)) {
      seen.set(headline.sourceId, {
        id: headline.sourceId,
        name: headline.sourceName,
        siteUrl: headline.sourceUrl
      });
    }
  }
  return [...seen.values()];
}

/**
 * Builds a diverse pool of headlines for client-side refresh rotation.
 * Returns up to `maxPool` deduplicated, diverse headlines sorted by recency,
 * giving the client enough variety to present a meaningfully different set.
 */
export function buildHeadlinePool(headlines: Headline[], maxPool = 15): Headline[] {
  return selectDiverseHeadlines(headlines, 0, maxPool);
}
