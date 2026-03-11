import path from 'node:path';
import { DEFAULT_FEEDS } from '../config/feeds';
import { createChaos } from './chaos';
import { persistDailyEntry, entryExists } from './content';
import { DEFAULT_TIMEZONE, TARGET_PUBLISH_HOUR, TARGET_PUBLISH_MINUTE, formatLocalDateLabel, getDateKey, isWithinPublishWindow } from './date';
import { buildHeadlinePool, filterFreshHeadlines, selectDiverseHeadlines, uniqueSources } from './headlines';
import { fetchFeedXml, parseFeedXml } from './rss';
import { createSummary } from './summarize';
import type { DailyEntry, Headline } from '../types';

export interface GenerateDailySnapshotOptions {
  rootDir: string;
  now?: Date;
  allowOutsideWindow?: boolean;
  forceDate?: string;
  fetchFeed?: (url: string) => Promise<string>;
}

export interface GenerateDailySnapshotResult {
  status: 'created' | 'skipped';
  reason?: string;
  entry?: DailyEntry;
  errors: string[];
}

function fallbackHeadlines(): Headline[] {
  return [
    {
      title: 'No fresh headlines survived the daily filter',
      description:
        'The free feeds did not produce enough current items inside the rolling freshness window.',
      sourceId: 'system',
      sourceName: 'System Fallback',
      sourceUrl: 'https://github.com/',
      link: 'https://github.com/',
      publishedAt: null
    }
  ];
}

export function shouldRunDailyGeneration(now: Date, allowOutsideWindow = false): boolean {
  if (allowOutsideWindow) {
    return true;
  }

  return isWithinPublishWindow(now, DEFAULT_TIMEZONE, TARGET_PUBLISH_HOUR, TARGET_PUBLISH_MINUTE);
}

export async function generateDailySnapshot(
  options: GenerateDailySnapshotOptions
): Promise<GenerateDailySnapshotResult> {
  const rootDir = path.resolve(options.rootDir);
  const now = options.now ?? new Date();
  const fetchFeed = options.fetchFeed ?? fetchFeedXml;

  if (!shouldRunDailyGeneration(now, options.allowOutsideWindow)) {
    return {
      status: 'skipped',
      reason: 'outside publish window',
      errors: []
    };
  }

  const date = options.forceDate ?? getDateKey(now, DEFAULT_TIMEZONE);
  const displayDate = options.forceDate ? new Date(`${date}T12:00:00Z`) : now;

  if (await entryExists(rootDir, date)) {
    return {
      status: 'skipped',
      reason: 'entry already exists',
      errors: []
    };
  }

  const feedResults = await Promise.allSettled(
    DEFAULT_FEEDS.map(async (source) => {
      const xml = await fetchFeed(source.url);
      return parseFeedXml(xml, source);
    })
  );

  const errors: string[] = [];
  const headlines: Headline[] = [];

  feedResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      headlines.push(...result.value);
    } else {
      const source = DEFAULT_FEEDS[index];
      errors.push(`${source.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  });

  const fresh = filterFreshHeadlines(headlines, now);
  const selected = selectDiverseHeadlines(fresh);
  const finalHeadlines = selected.length > 0 ? selected : fallbackHeadlines();
  const pool = buildHeadlinePool(fresh);
  const chaos = createChaos(date);

  const entry: DailyEntry = {
    date,
    localDateLabel: formatLocalDateLabel(displayDate, DEFAULT_TIMEZONE),
    summary: createSummary(finalHeadlines),
    headlines: finalHeadlines,
    headlinePool: pool,
    sources: uniqueSources(finalHeadlines),
    theme: chaos.theme,
    layout: chaos.layout,
    seed: chaos.seed,
    generatedAt: now.toISOString()
  };

  await persistDailyEntry(rootDir, entry);

  return {
    status: 'created',
    entry,
    errors
  };
}
