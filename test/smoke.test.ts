import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_FEEDS } from '../src/config/feeds';
import { generateDailySnapshot } from '../src/lib/generate';
import { buildSite } from '../src/renderers/site';

const fixedNow = new Date('2026-03-06T13:32:00Z');

async function fixtureMap(): Promise<Map<string, string>> {
  const names = ['npr', 'bbc', 'guardian', 'ars'];
  const files = await Promise.all(
    names.map((name) => readFile(path.join(process.cwd(), 'test', 'fixtures', 'rss', `${name}.xml`), 'utf8'))
  );
  return new Map(files.map((content, index) => [DEFAULT_FEEDS[index].url, content]));
}

test('generator smoke test writes markdown, json, and build output in sync', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'git-populate-'));
  await mkdir(path.join(rootDir, 'content', 'days'), { recursive: true });
  await mkdir(path.join(rootDir, 'data', 'days'), { recursive: true });
  const fixtures = await fixtureMap();

  const result = await generateDailySnapshot({
    rootDir,
    now: fixedNow,
    allowOutsideWindow: true,
    fetchFeed: async (url) => fixtures.get(url) ?? '<rss><channel /></rss>'
  });

  assert.equal(result.status, 'created');
  assert.equal(result.entry?.date, '2026-03-06');
  assert.ok(result.entry?.headlines.length && result.entry.headlines.length >= 5);

  await buildSite(rootDir, '/git-populate/');

  const markdown = await readFile(path.join(rootDir, 'content', 'days', '2026-03-06.md'), 'utf8');
  const latestJson = await readFile(path.join(rootDir, 'data', 'latest.json'), 'utf8');
  const homepage = await readFile(path.join(rootDir, 'dist', 'index.html'), 'utf8');

  assert.match(markdown, /Friday, March 6, 2026/);
  assert.match(latestJson, /"date": "2026-03-06"/);
  assert.match(homepage, /base href="\/git-populate\/"/);
  assert.match(homepage, /seed/);

  const secondRun = await generateDailySnapshot({
    rootDir,
    now: fixedNow,
    allowOutsideWindow: true,
    fetchFeed: async (url) => fixtures.get(url) ?? '<rss><channel /></rss>'
  });
  assert.equal(secondRun.status, 'skipped');
  assert.equal(secondRun.reason, 'entry already exists');
});

test('generator survives one feed failure and all-empty feed fallback', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'git-populate-'));
  await mkdir(path.join(rootDir, 'content', 'days'), { recursive: true });
  await mkdir(path.join(rootDir, 'data', 'days'), { recursive: true });
  const fixtures = await fixtureMap();

  const partial = await generateDailySnapshot({
    rootDir,
    now: fixedNow,
    allowOutsideWindow: true,
    forceDate: '2026-03-07',
    fetchFeed: async (url) => {
      if (url === DEFAULT_FEEDS[0].url) {
        throw new Error('simulated outage');
      }
      return fixtures.get(url) ?? '<rss><channel /></rss>';
    }
  });

  assert.equal(partial.status, 'created');
  assert.equal(partial.errors.length, 1);

  const fallbackRoot = await mkdtemp(path.join(os.tmpdir(), 'git-populate-'));
  await mkdir(path.join(fallbackRoot, 'content', 'days'), { recursive: true });
  await mkdir(path.join(fallbackRoot, 'data', 'days'), { recursive: true });

  const fallback = await generateDailySnapshot({
    rootDir: fallbackRoot,
    now: fixedNow,
    allowOutsideWindow: true,
    forceDate: '2026-03-08',
    fetchFeed: async () => '<rss><channel></channel></rss>'
  });

  assert.equal(fallback.status, 'created');
  assert.match(fallback.entry?.summary ?? '', /quiet today/i);
});
