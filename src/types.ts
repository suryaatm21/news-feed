export type LayoutName = 'orbit' | 'poster' | 'ticker';

export type ThemeName =
  | 'sunprint'
  | 'ember'
  | 'lagoon'
  | 'citrus'
  | 'nocturne'
  | 'newsprint';

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  siteUrl: string;
}

export interface Headline {
  title: string;
  description: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  link: string;
  publishedAt: string | null;
}

export interface DailyEntry {
  date: string;
  localDateLabel: string;
  summary: string;
  headlines: Headline[];
  sources: Array<{
    id: string;
    name: string;
    siteUrl: string;
  }>;
  theme: ThemeName;
  layout: LayoutName;
  seed: string;
  generatedAt: string;
}

export interface ArchiveRecord {
  date: string;
  localDateLabel: string;
  summary: string;
  path: string;
  theme: ThemeName;
  layout: LayoutName;
}

export interface ChaosVariant {
  seed: string;
  theme: ThemeName;
  layout: LayoutName;
}
