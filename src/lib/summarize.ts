import type { Headline } from '../types';

const STOP_WORDS = new Set([
  'about',
  'after',
  'alerts',
  'amid',
  'around',
  'because',
  'being',
  'continue',
  'email',
  'follow',
  'from',
  'into',
  'latest',
  'newsletter',
  'over',
  'podcast',
  'reading',
  'signup',
  'subscribe',
  'that',
  'their',
  'there',
  'these',
  'this',
  'today',
  'updates',
  'with',
  'will',
  'your'
]);

/**
 * Returns a short, display-friendly source name by stripping common prefixes
 * ("The ") and generic suffixes ("World", "Stories", "News", "Top Stories").
 * e.g. "The Guardian World" → "Guardian", "NPR Top Stories" → "NPR", "BBC World" → "BBC".
 */
function shortSourceName(name: string): string {
  return (
    name
      .replace(/^The\s+/i, '')
      .replace(/\s+(?:Top\s+Stories?|World|News|Stories|International|Global)$/i, '')
      .trim() || name
  );
}

function keywordsFromText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 4 && !STOP_WORDS.has(token));
}

function topKeywords(headlines: Headline[], count = 3): string[] {
  const frequencies = new Map<string, number>();

  for (const headline of headlines) {
    const combined = `${headline.title} ${headline.description}`;
    for (const token of keywordsFromText(combined)) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }
  }

  return [...frequencies.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, count)
    .map(([token]) => token);
}

function formatList(parts: string[]): string {
  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
}

export function createSummary(headlines: Headline[]): string {
  if (headlines.length === 0) {
    return 'The feeds were quiet today, so the page falls back to a minimal date marker and waits for tomorrow’s cycle.';
  }

  if (headlines.every((headline) => headline.sourceId === 'system')) {
    return 'The feeds were quiet today, so the page falls back to a minimal date marker and waits for tomorrow’s cycle.';
  }

  const leadTitles = headlines.slice(0, 3).map((headline) => headline.title.replace(/[.?!]+$/, ''));
  const leadSentence = `Today’s pulse tracks ${formatList(leadTitles)}.`;

  const keywords = topKeywords(headlines);
  const sources = [...new Set(headlines.map((headline) => shortSourceName(headline.sourceName)))].slice(0, 4);
  const sourceSentence =
    keywords.length > 0
      ? `Across ${formatList(sources)}, the strongest repeated signals are ${formatList(keywords)}.`
      : `Across ${formatList(sources)}, the tone stays broad rather than concentrated on one single thread.`;

  if (headlines.length < 5) {
    return `${leadSentence} ${sourceSentence}`;
  }

  const tailTitles = headlines.slice(3, 5).map((headline) => headline.title.replace(/[.?!]+$/, ''));
  const closer = `In the background, ${formatList(tailTitles)} keep the wider picture in motion.`;
  return `${leadSentence} ${sourceSentence} ${closer}`;
}
