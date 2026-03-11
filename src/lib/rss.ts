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

/**
 * Removes promotional and engagement cruft injected by RSS feeds into descriptions:
 * newsletter sign-up prompts, app/podcast CTAs, live-blog follow links, reader
 * engagement questions, inline author bylines, and the ubiquitous "Continue reading…".
 */
function cleanDescription(text: string): string {
  return text
    // "Continue reading..." — Guardian trailer on every item
    .replace(/\bContinue reading[.\u2026]*/gi, '')
    // Newsletter / app / podcast sign-up CTAs
    .replace(/Sign up for [^.]*?(?:newsletter|email|alerts)[^.]*?\./gi, '')
    .replace(/Get our [^.]*?(?:email|newsletter|podcast|app)[^.]*?\./gi, '')
    // Live-blog follow prompts ("Follow our Australia news live blog for latest updates")
    .replace(/Follow (?:our )?[\w ]+ (?:live blog|news blog)[^.]*?\./gi, '')
    .replace(/\bFollow updates live\b[^.]*?(?:\.|$)/gi, '')
    // Reader engagement / crowdsourcing questions
    .replace(/(?:Tell us|How have you been affected|Are you affected|Send us your|Share your)[^?]*\?/gi, '')
    // Inline author bylines ("Jane Smith is The Guardian's science editor.")
    .replace(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)+ is [^.]*?(?:editor|reporter|correspondent|writer|columnist)[^.]*?\./g, '')
    // Subscribe / register prompts
    .replace(/\bSubscribe[^.]*?to (?:read|continue|access)[^.]*?\./gi, '')
    .replace(/\bRegister[^.]*?(?:to read|to continue)[^.]*?\./gi, '')
    // Photo / illustration credits
    .replace(/\bPhotographs?: [^.]*?\./gi, '')
    .replace(/\bIllustration: [^.]*?\./gi, '')
    // Normalise remaining whitespace
    .replace(/\s{2,}/g, ' ')
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
      const description = cleanDescription(
        extractTag(block, ['description', 'summary', 'content:encoded', 'content']) ?? ''
      );
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
