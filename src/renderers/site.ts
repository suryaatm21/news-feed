import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { THEMES } from '../lib/chaos';
import type { ArchiveRecord, DailyEntry, Headline } from '../types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHeadlineList(headlines: Headline[]): string {
  return headlines
    .map(
      (headline, index) => `
        <article class="headline-card" style="--delay:${index * 120}ms">
          <span class="headline-source">${escapeHtml(headline.sourceName)}</span>
          <h3><a href="${headline.link}">${escapeHtml(headline.title)}</a></h3>
          <p>${escapeHtml(headline.description || 'No additional description was provided by the feed.')}</p>
        </article>
      `
    )
    .join('');
}

function renderArchiveList(archive: ArchiveRecord[]): string {
  return archive
    .map(
      (record) => `
        <li>
          <a href="${record.path}">
            <span>${escapeHtml(record.localDateLabel)}</span>
            <strong>${escapeHtml(record.layout)}</strong>
          </a>
        </li>
      `
    )
    .join('');
}

function renderDecor(entry: DailyEntry): string {
  if (entry.layout === 'orbit') {
    return `
      <div class="decor decor-orbit">
        <span></span><span></span><span></span>
      </div>
    `;
  }

  if (entry.layout === 'poster') {
    return `
      <div class="decor decor-poster">
        <span></span><span></span><span></span><span></span>
      </div>
    `;
  }

  return `
    <div class="decor decor-ticker">
      <div>${entry.headlines.map((headline) => escapeHtml(headline.title)).join(' • ')}</div>
    </div>
  `;
}

function pageShell(
  title: string,
  entry: DailyEntry,
  archive: ArchiveRecord[],
  siteBasePath: string,
  bodyClass: string,
  pageBody: string
): string {
  const theme = THEMES[entry.theme];
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(entry.summary)}" />
    <base href="${siteBasePath}" />
    <link rel="stylesheet" href="styles.css" />
    <script type="module" src="app.js"></script>
  </head>
  <body class="${bodyClass} layout-${entry.layout}" style="--page-bg:${theme.background};--surface:${theme.surface};--accent:${theme.accent};--text:${theme.text};--muted:${theme.muted};--glow:${theme.glow}">
    <main class="shell">
      <header class="hero">
        <div>
          <p class="eyebrow">daily github activity</p>
          <h1>${escapeHtml(entry.localDateLabel)}</h1>
          <p class="summary">${escapeHtml(entry.summary)}</p>
        </div>
        <div class="meta">
          <span>seed ${escapeHtml(entry.seed)}</span>
          <span>${escapeHtml(entry.theme)} / ${escapeHtml(entry.layout)}</span>
        </div>
      </header>

      ${renderDecor(entry)}

      ${pageBody}

      <aside class="archive-panel">
        <div class="archive-header">
          <h2>Archive</h2>
          <a href="archive/">See all</a>
        </div>
        <ul class="archive-list">
          ${renderArchiveList(archive.slice(0, 12))}
        </ul>
      </aside>
    </main>
  </body>
</html>`;
}

function renderHomePage(entry: DailyEntry, archive: ArchiveRecord[], siteBasePath: string): string {
  return pageShell(
    `${entry.localDateLabel} | News Feed`,
    entry,
    archive,
    siteBasePath,
    'page-home',
    `
      <section class="headline-grid">
        ${renderHeadlineList(entry.headlines)}
      </section>
    `
  );
}

function renderDayPage(entry: DailyEntry, archive: ArchiveRecord[], siteBasePath: string): string {
  return pageShell(
    `${entry.localDateLabel} Archive | News Feed`,
    entry,
    archive,
    siteBasePath,
    'page-day',
    `
      <section class="focus-card">
        <h2>Snapshot</h2>
        <p>${escapeHtml(entry.summary)}</p>
        <ul class="source-list">
          ${entry.sources
            .map(
              (source) =>
                `<li><a href="${source.siteUrl}">${escapeHtml(source.name)}</a></li>`
            )
            .join('')}
        </ul>
      </section>
      <section class="headline-grid">
        ${renderHeadlineList(entry.headlines)}
      </section>
    `
  );
}

function renderArchivePage(latest: DailyEntry, archive: ArchiveRecord[], siteBasePath: string): string {
  return pageShell(
    'Archive | News Feed',
    latest,
    archive,
    siteBasePath,
    'page-archive',
    `
      <section class="archive-cards">
        ${archive
          .map(
            (record) => `
              <article class="archive-card">
                <a href="${record.path}">
                  <p>${escapeHtml(record.localDateLabel)}</p>
                  <h2>${escapeHtml(record.summary)}</h2>
                  <span>${escapeHtml(record.theme)} / ${escapeHtml(record.layout)}</span>
                </a>
              </article>
            `
          )
          .join('')}
      </section>
    `
  );
}

const STYLES = `
:root {
  color-scheme: dark;
  --display-font: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  --body-font: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--body-font);
  background: var(--page-bg);
  color: var(--text);
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 28%),
    radial-gradient(circle at 80% 0%, rgba(255,255,255,0.08), transparent 20%),
    linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0));
  pointer-events: none;
}

a {
  color: inherit;
}

.shell {
  width: min(1120px, calc(100% - 1.5rem));
  margin: 0 auto;
  padding: 1rem 0 4rem;
}

.hero,
.archive-panel,
.focus-card,
.headline-card,
.archive-card {
  background: var(--surface);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(14px);
  box-shadow: 0 16px 60px rgba(0, 0, 0, 0.24);
}

.hero {
  padding: 1.2rem;
  border-radius: 1.5rem;
  display: grid;
  gap: 1rem;
}

.eyebrow,
.meta,
.headline-source,
.archive-card span,
.archive-list strong {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
}

.hero h1,
.archive-card h2 {
  font-family: var(--display-font);
}

.hero h1 {
  margin: 0.35rem 0 0.75rem;
  font-size: clamp(2.3rem, 10vw, 4.75rem);
  line-height: 0.92;
}

.summary {
  margin: 0;
  font-size: 1rem;
  line-height: 1.65;
  color: var(--accent);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 1rem;
  color: var(--muted);
}

.decor {
  position: relative;
  margin: 1rem 0 1.2rem;
  overflow: hidden;
  min-height: 10rem;
  border-radius: 1.4rem;
  border: 1px solid rgba(255,255,255,0.1);
  background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
}

.decor-orbit span,
.decor-poster span {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.07);
  box-shadow: 0 0 28px rgba(255,255,255,0.08), 0 0 48px var(--glow);
}

.decor-orbit span:nth-child(1) {
  width: 18rem;
  height: 18rem;
  left: -3rem;
  top: -5rem;
  animation: drift 20s ease-in-out infinite;
}

.decor-orbit span:nth-child(2) {
  width: 9rem;
  height: 9rem;
  right: 10%;
  top: 1rem;
  animation: drift 14s ease-in-out infinite reverse;
}

.decor-orbit span:nth-child(3) {
  width: 5rem;
  height: 5rem;
  right: 24%;
  bottom: 1rem;
  animation: drift 12s ease-in-out infinite;
}

.decor-poster span:nth-child(1),
.decor-poster span:nth-child(3) {
  width: 28%;
  height: 100%;
  top: 0;
  transform: skewX(-18deg);
}

.decor-poster span:nth-child(1) {
  left: -8%;
}

.decor-poster span:nth-child(2) {
  width: 10rem;
  height: 10rem;
  right: 7%;
  top: 1rem;
}

.decor-poster span:nth-child(3) {
  left: 36%;
}

.decor-poster span:nth-child(4) {
  width: 4rem;
  height: 4rem;
  left: 55%;
  bottom: 1rem;
}

.decor-ticker {
  display: grid;
  place-items: center;
}

.decor-ticker div {
  white-space: nowrap;
  font-family: var(--display-font);
  font-size: clamp(1.3rem, 5vw, 2.4rem);
  animation: ticker 26s linear infinite;
  color: var(--accent);
  padding-right: 3rem;
}

.headline-grid,
.archive-cards {
  display: grid;
  gap: 0.95rem;
}

.headline-card,
.focus-card,
.archive-card,
.archive-panel {
  border-radius: 1.35rem;
}

.headline-card,
.focus-card,
.archive-card {
  padding: 1rem;
}

.headline-card {
  opacity: 0;
  transform: translateY(16px);
  animation: reveal 500ms ease forwards;
  animation-delay: var(--delay, 0ms);
}

.headline-card h3 {
  margin: 0.45rem 0;
  font-family: var(--display-font);
  font-size: 1.25rem;
  line-height: 1.12;
}

.headline-card p,
.focus-card p,
.archive-card h2 {
  margin: 0;
  line-height: 1.6;
}

.archive-panel {
  margin-top: 1rem;
  padding: 1rem;
}

.archive-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.archive-list,
.source-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.archive-list li + li,
.source-list li + li {
  margin-top: 0.7rem;
}

.archive-list a,
.source-list a,
.archive-card a {
  text-decoration: none;
}

.archive-list a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--accent);
}

.archive-cards {
  margin-top: 1rem;
}

.archive-card h2 {
  margin-top: 0.55rem;
  font-size: 1.3rem;
}

@media (min-width: 720px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }

  .headline-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .archive-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 960px) {
  .headline-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .archive-cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@keyframes drift {
  0%, 100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(0.75rem, 1rem, 0) scale(1.05);
  }
}

@keyframes ticker {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

const SCRIPT = `
const cards = document.querySelectorAll('.headline-card');
const timer = setInterval(() => {
  document.body.dataset.pulse = document.body.dataset.pulse === '1' ? '0' : '1';
}, 3600);

window.addEventListener('pagehide', () => clearInterval(timer));

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  cards.forEach((card) => {
    card.style.animation = 'none';
    card.style.opacity = '1';
    card.style.transform = 'none';
  });
}
`;

async function ensureDirectory(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function writePage(filePath: string, content: string): Promise<void> {
  await ensureDirectory(filePath);
  await writeFile(filePath, content, 'utf8');
}

export async function buildSite(rootDir: string, siteBasePath = '/'): Promise<void> {
  const distDir = path.join(rootDir, 'dist');
  const latest = JSON.parse(
    await readFile(path.join(rootDir, 'data', 'latest.json'), 'utf8')
  ) as DailyEntry;
  const archive = JSON.parse(
    await readFile(path.join(rootDir, 'data', 'archive.json'), 'utf8')
  ) as ArchiveRecord[];

  const normalizedBasePath = siteBasePath.endsWith('/') ? siteBasePath : `${siteBasePath}/`;

  await writePage(path.join(distDir, 'index.html'), renderHomePage(latest, archive, normalizedBasePath));
  await writePage(
    path.join(distDir, 'archive', 'index.html'),
    renderArchivePage(latest, archive, normalizedBasePath)
  );
  await writePage(path.join(distDir, 'styles.css'), STYLES);
  await writePage(path.join(distDir, 'app.js'), SCRIPT);

  for (const record of archive) {
    const entry = JSON.parse(
      await readFile(path.join(rootDir, 'data', 'days', `${record.date}.json`), 'utf8')
    ) as DailyEntry;
    await writePage(
      path.join(distDir, 'days', record.date, 'index.html'),
      renderDayPage(entry, archive, normalizedBasePath)
    );
  }
}
