import type { Headline, SourceConfig } from '../types';

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function stripHtml(text: string): string {
  return decodeEntities(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectBlocks(xml: string, tagName: 'item' | 'entry'): string[] {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  return [...xml.matchAll(pattern)].map((match) => match[1] ?? '');
}

function extractTag(block: string, tagNames: string[]): string | null {
  for (const tagName of tagNames) {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = block.match(pattern);
    if (match?.[1]) {
      return stripHtml(match[1]);
    }
  }

  return null;
}

function extractLink(block: string): string | null {
  const hrefMatch = block.match(/<link\b[^>]*href="([^"]+)"[^>]*\/?>/i);
  if (hrefMatch?.[1]) {
    return hrefMatch[1].trim();
  }

  const textMatch = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
  if (textMatch?.[1]) {
    return stripHtml(textMatch[1]);
  }

  return null;
}

export function parseFeedXml(xml: string, source: SourceConfig): Headline[] {
  const blocks = [...collectBlocks(xml, 'item'), ...collectBlocks(xml, 'entry')];

  return blocks
    .map((block) => {
      const title = extractTag(block, ['title']);
      const description =
        extractTag(block, ['description', 'summary', 'content:encoded', 'content']) ?? '';
      const link = extractLink(block) ?? source.siteUrl;
      const publishedAt =
        extractTag(block, ['pubDate', 'published', 'updated', 'dc:date']) ?? null;

      if (!title) {
        return null;
      }

      return {
        title,
        description,
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.siteUrl,
        link,
        publishedAt
      } satisfies Headline;
    })
    .filter((entry): entry is Headline => entry !== null);
}

export async function fetchFeedXml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'git-populate/1.0 (+https://github.com)'
    }
  });

  if (!response.ok) {
    throw new Error(`Feed request failed with ${response.status} for ${url}`);
  }

  return response.text();
}
