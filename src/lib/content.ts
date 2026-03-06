import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ArchiveRecord, DailyEntry } from '../types';

function yamlEscape(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function renderMarkdown(entry: DailyEntry): string {
  const frontmatter = [
    '---',
    `date: ${entry.date}`,
    `localDateLabel: ${yamlEscape(entry.localDateLabel)}`,
    `summary: ${yamlEscape(entry.summary)}`,
    `theme: ${entry.theme}`,
    `layout: ${entry.layout}`,
    `seed: ${yamlEscape(entry.seed)}`,
    `generatedAt: ${yamlEscape(entry.generatedAt)}`,
    'sources:'
  ];

  for (const source of entry.sources) {
    frontmatter.push(`  - id: ${source.id}`);
    frontmatter.push(`    name: ${yamlEscape(source.name)}`);
    frontmatter.push(`    siteUrl: ${yamlEscape(source.siteUrl)}`);
  }

  frontmatter.push('headlines:');
  for (const headline of entry.headlines) {
    frontmatter.push(`  - title: ${yamlEscape(headline.title)}`);
    frontmatter.push(`    description: ${yamlEscape(headline.description)}`);
    frontmatter.push(`    link: ${yamlEscape(headline.link)}`);
    frontmatter.push(`    sourceId: ${headline.sourceId}`);
    frontmatter.push(`    sourceName: ${yamlEscape(headline.sourceName)}`);
    frontmatter.push(`    sourceUrl: ${yamlEscape(headline.sourceUrl)}`);
    frontmatter.push(
      `    publishedAt: ${headline.publishedAt ? yamlEscape(headline.publishedAt) : 'null'}`
    );
  }
  frontmatter.push('---', '', `# ${entry.localDateLabel}`, '', entry.summary, '', '## Headlines', '');

  for (const headline of entry.headlines) {
    frontmatter.push(`- [${headline.title}](${headline.link})`);
  }

  frontmatter.push('', '## Sources', '');
  for (const source of entry.sources) {
    frontmatter.push(`- [${source.name}](${source.siteUrl})`);
  }

  return frontmatter.join('\n');
}

async function readArchiveRecords(rootDir: string): Promise<ArchiveRecord[]> {
  const archivePath = path.join(rootDir, 'data', 'archive.json');
  try {
    const content = await readFile(archivePath, 'utf8');
    return JSON.parse(content) as ArchiveRecord[];
  } catch (error) {
    return [];
  }
}

export async function entryExists(rootDir: string, date: string): Promise<boolean> {
  const filePath = path.join(rootDir, 'data', 'days', `${date}.json`);
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch (error) {
    return false;
  }
}

export async function persistDailyEntry(rootDir: string, entry: DailyEntry): Promise<void> {
  const contentDir = path.join(rootDir, 'content', 'days');
  const dataDir = path.join(rootDir, 'data', 'days');
  await mkdir(contentDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });

  const markdownPath = path.join(contentDir, `${entry.date}.md`);
  const jsonPath = path.join(dataDir, `${entry.date}.json`);
  const latestPath = path.join(rootDir, 'data', 'latest.json');
  const archivePath = path.join(rootDir, 'data', 'archive.json');

  await writeFile(markdownPath, `${renderMarkdown(entry)}\n`, 'utf8');
  await writeFile(jsonPath, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
  await writeFile(latestPath, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');

  const archiveRecords = await readArchiveRecords(rootDir);
  const nextRecord: ArchiveRecord = {
    date: entry.date,
    localDateLabel: entry.localDateLabel,
    summary: entry.summary,
    path: `days/${entry.date}/`,
    theme: entry.theme,
    layout: entry.layout
  };

  const deduped = archiveRecords.filter((record) => record.date !== entry.date);
  deduped.unshift(nextRecord);
  deduped.sort((left, right) => right.date.localeCompare(left.date));

  await writeFile(archivePath, `${JSON.stringify(deduped, null, 2)}\n`, 'utf8');
}
