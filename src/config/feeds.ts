import type { SourceConfig } from '../types';

export const DEFAULT_FEEDS: SourceConfig[] = [
  {
    id: 'npr',
    name: 'NPR Top Stories',
    url: 'https://feeds.npr.org/1001/rss.xml',
    siteUrl: 'https://www.npr.org/'
  },
  {
    id: 'bbc',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    siteUrl: 'https://www.bbc.com/news/world'
  },
  {
    id: 'guardian',
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    siteUrl: 'https://www.theguardian.com/world'
  },
  {
    id: 'ars',
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    siteUrl: 'https://arstechnica.com/'
  }
];
