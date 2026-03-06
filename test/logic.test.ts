import test from 'node:test';
import assert from 'node:assert/strict';
import { createChaos } from '../src/lib/chaos';
import { filterFreshHeadlines, selectDiverseHeadlines } from '../src/lib/headlines';
import { shouldRunDailyGeneration } from '../src/lib/generate';
import type { Headline } from '../src/types';

test('filterFreshHeadlines removes stale feed items', () => {
  const now = new Date('2026-03-06T13:32:00Z');
  const items: Headline[] = [
    {
      title: 'Fresh item',
      description: 'Fresh',
      sourceId: 'a',
      sourceName: 'A',
      sourceUrl: 'https://example.com',
      link: 'https://example.com/fresh',
      publishedAt: '2026-03-06T12:00:00Z'
    },
    {
      title: 'Stale item',
      description: 'Stale',
      sourceId: 'b',
      sourceName: 'B',
      sourceUrl: 'https://example.com',
      link: 'https://example.com/stale',
      publishedAt: '2026-03-04T00:00:00Z'
    }
  ];

  const filtered = filterFreshHeadlines(items, now);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, 'Fresh item');
});

test('selectDiverseHeadlines deduplicates near-identical titles', () => {
  const items: Headline[] = [
    {
      title: 'Senators negotiate late budget package after overnight talks',
      description: 'A',
      sourceId: 'a',
      sourceName: 'A',
      sourceUrl: 'https://example.com',
      link: 'https://example.com/a',
      publishedAt: '2026-03-06T12:00:00Z'
    },
    {
      title: 'Senators negotiate budget package after overnight talks',
      description: 'B',
      sourceId: 'b',
      sourceName: 'B',
      sourceUrl: 'https://example.com',
      link: 'https://example.com/b',
      publishedAt: '2026-03-06T11:59:00Z'
    },
    {
      title: 'Markets steady as central bank signals patience on rates',
      description: 'C',
      sourceId: 'c',
      sourceName: 'C',
      sourceUrl: 'https://example.com',
      link: 'https://example.com/c',
      publishedAt: '2026-03-06T11:58:00Z'
    }
  ];

  const selected = selectDiverseHeadlines(items, 2, 3);
  assert.equal(selected.length, 2);
});

test('createChaos is deterministic for the same date', () => {
  const first = createChaos('2026-03-06');
  const second = createChaos('2026-03-06');
  assert.deepEqual(first, second);
});

test('shouldRunDailyGeneration handles EST and EDT schedule windows', () => {
  assert.equal(shouldRunDailyGeneration(new Date('2026-01-15T13:32:00Z')), true);
  assert.equal(shouldRunDailyGeneration(new Date('2026-07-15T12:32:00Z')), true);
  assert.equal(shouldRunDailyGeneration(new Date('2026-01-15T12:32:00Z')), false);
});
