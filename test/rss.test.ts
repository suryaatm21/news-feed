import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_FEEDS } from '../src/config/feeds';
import { parseFeedXml } from '../src/lib/rss';

const fixtureRoot = path.join(process.cwd(), 'test', 'fixtures', 'rss');

test('parseFeedXml handles RSS and Atom fixtures', async () => {
  const [nprXml, arsXml] = await Promise.all([
    readFile(path.join(fixtureRoot, 'npr.xml'), 'utf8'),
    readFile(path.join(fixtureRoot, 'ars.xml'), 'utf8')
  ]);

  const nprItems = parseFeedXml(nprXml, DEFAULT_FEEDS[0]);
  const arsItems = parseFeedXml(arsXml, DEFAULT_FEEDS[3]);

  assert.equal(nprItems.length, 2);
  assert.equal(arsItems.length, 2);
  assert.match(nprItems[0].title, /budget package/i);
  assert.equal(arsItems[0].link, 'https://arstechnica.com/space/2026/03/reusable-rocket-test/');
  assert.match(arsItems[1].title, /memory leak/i);
});
