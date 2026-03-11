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

/** Serializes a value to JSON safe for embedding in a script tag (prevents script injection via </script>). */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\/script>/gi, '<\\/script>');
}

function renderHeadlineList(headlines: Headline[]): string {
  return headlines
    .map(
      (headline, index) => `
        <article class="headline-card" style="--delay:${index * 120}ms" data-link="${escapeHtml(headline.link)}">
          <div class="card-header">
            <span class="headline-source">${escapeHtml(headline.sourceName)}</span>
            <button class="pin-btn" aria-label="Pin article" data-link="${escapeHtml(headline.link)}">📌</button>
          </div>
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
        <li data-date="${record.date}" data-label="${escapeHtml(record.localDateLabel.toLowerCase())}">
          <a href="${record.path}">
            <span>${escapeHtml(record.localDateLabel)}</span>
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
    <script type="application/json" id="entry-data">${safeJson({ date: entry.date, headlines: entry.headlines, pool: entry.headlinePool ?? [] })}</script>
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
        <div class="hero-side">
          <div class="meta">
            <span>seed ${escapeHtml(entry.seed)}</span>
            <span>${escapeHtml(entry.theme)} / ${escapeHtml(entry.layout)}</span>
          </div>
          <button id="refresh-btn" class="refresh-btn" title="Load a different set of articles for this day">
            <span class="refresh-icon">↻</span>Refresh
          </button>
        </div>
      </header>

      ${renderDecor(entry)}

      ${pageBody}

      <aside class="archive-panel">
        <div class="archive-header">
          <h2>Archive</h2>
          <a href="archive/">See all</a>
        </div>
        <div class="archive-picker-wrap">
          <input class="archive-search archive-datepicker" type="date" aria-label="Jump to date" id="archive-search" />
          <button class="archive-clear-btn" id="archive-clear" type="button">Clear</button>
        </div>
        <ul class="archive-list">
          ${renderArchiveList(archive)}
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
      <section class="archive-cards-section">
        <div class="archive-picker-wrap">
          <input class="archive-search archive-datepicker" type="date" aria-label="Jump to date" id="archive-page-search" />
          <button class="archive-clear-btn" id="archive-page-clear" type="button">Clear</button>
        </div>
        <div class="archive-cards">
          ${archive
            .map(
              (record) => `
                <article class="archive-card" data-date="${record.date}" data-label="${escapeHtml(record.localDateLabel.toLowerCase())}">
                  <a href="${record.path}">
                    <p>${escapeHtml(record.localDateLabel)}</p>
                    <h2>${escapeHtml(record.summary)}</h2>
                  </a>
                </article>
              `
            )
            .join('')}
        </div>
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
  min-height: 5rem;
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

/* ── Card header with pin button ─────────────────────────────────────────── */

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.pin-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.15rem 0.2rem;
  font-size: 0.82rem;
  line-height: 1;
  opacity: 0.28;
  transition: opacity 0.2s, transform 0.2s;
  color: inherit;
  border-radius: 0.3rem;
  flex-shrink: 0;
}

.pin-btn:hover {
  opacity: 0.75;
}

.pin-btn.pinned {
  opacity: 1;
}

.headline-card.pinned {
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 0 0 1px var(--glow), 0 8px 40px rgba(0, 0, 0, 0.2);
}

/* ── Hero side: meta + refresh button ───────────────────────────────────── */

.hero-side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.42rem 0.9rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.76rem;
  font-family: var(--body-font);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: background 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.refresh-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.refresh-icon {
  display: inline-block;
  font-size: 1rem;
  line-height: 1;
}

.refresh-icon.spinning {
  animation: spin 0.35s linear;
}

/* ── Archive pin badge ───────────────────────────────────────────────────── */

.pin-badge {
  font-size: 0.63rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  color: var(--accent);
  margin-left: 0.4rem;
  vertical-align: middle;
}

.headline-card p,
.focus-card p,
.archive-card h2 {
  margin: 0;
  line-height: 1.6;
}

/* Uniform tile height: 3-line viewport — scroll to read more */
.headline-card p {
  max-height: calc(1.6em * 3);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}

.headline-card p::-webkit-scrollbar {
  width: 4px;
}

.headline-card p::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.22);
  border-radius: 2px;
}

/* ── Archive search / date picker ────────────────────────────────────────────── */

.archive-search {
  display: block;
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 0.6rem;
  color: inherit;
  font-family: var(--body-font);
  font-size: 0.8rem;
  padding: 0.38rem 0.65rem;
  margin: 0.55rem 0 0.5rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.archive-search:focus {
  border-color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.1);
}

/* Style the native date picker to match dark theme */
.archive-datepicker {
  color-scheme: dark;
  cursor: pointer;
}

/* WebKit calendar icon tint */
.archive-datepicker::-webkit-calendar-picker-indicator {
  filter: invert(1) opacity(0.55);
  cursor: pointer;
  transition: opacity 0.2s;
}

.archive-datepicker::-webkit-calendar-picker-indicator:hover {
  opacity: 0.9;
}

.archive-datepicker::placeholder {
  color: var(--muted);
  opacity: 0.7;
}

/* Wrapper for datepicker + clear button */
.archive-picker-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.55rem 0 0.5rem;
  width: 100%;
}

.archive-picker-wrap .archive-search {
  margin: 0;
  flex: 1;
  min-width: 0;
}

.archive-clear-btn {
  background: none;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 0.6rem;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.35rem 0.55rem;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.archive-clear-btn:hover {
  background: rgba(255,255,255,0.1);
  color: var(--accent);
}

.archive-cards-section {
  margin-top: 1rem;
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

.archive-list {
  max-height: 22rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.18) transparent;
}

.archive-list::-webkit-scrollbar {
  width: 4px;
}

.archive-list::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.22);
  border-radius: 2px;
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

  .hero-side {
    align-items: flex-end;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
`;

const SCRIPT = `
/** Escapes HTML special characters for safe dynamic insertion. */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Entry data embedded in page ──────────────────────────────────────────────
const entryDataEl = document.getElementById('entry-data');
let entryData = null;
try { entryData = entryDataEl ? JSON.parse(entryDataEl.textContent) : null; } catch (_) {}

const currentDate = entryData?.date ?? '';
const headlinePool = entryData?.pool ?? [];
let displayedHeadlines = entryData?.headlines ? [...entryData.headlines] : null;

// ── Pin persistence (localStorage, keyed by date) ────────────────────────────
function pinKey(date) { return 'newsfeed:pins:' + date; }

function loadPins(date) {
  try { return new Set(JSON.parse(localStorage.getItem(pinKey(date)) ?? '[]')); }
  catch (_) { return new Set(); }
}

function savePins(date, pins) {
  try { localStorage.setItem(pinKey(date), JSON.stringify([...pins])); }
  catch (_) {}
}

let pinnedLinks = currentDate ? loadPins(currentDate) : new Set();

// ── Headline card rendering ───────────────────────────────────────────────────
function renderCard(headline, delay) {
  const isPinned = pinnedLinks.has(headline.link);
  const desc = headline.description || 'No additional description was provided by the feed.';
  return '<article class="headline-card' + (isPinned ? ' pinned' : '') + '" style="--delay:' + delay + 'ms" data-link="' + escHtml(headline.link) + '">'
    + '<div class="card-header">'
    + '<span class="headline-source">' + escHtml(headline.sourceName) + '</span>'
    + '<button class="pin-btn' + (isPinned ? ' pinned' : '') + '" aria-label="' + (isPinned ? 'Unpin' : 'Pin') + ' article" data-link="' + escHtml(headline.link) + '">📌</button>'
    + '</div>'
    + '<h3><a href="' + escHtml(headline.link) + '">' + escHtml(headline.title) + '</a></h3>'
    + '<p>' + escHtml(desc) + '</p>'
    + '</article>';
}

/** Re-renders the headline grid: pinned articles sort to top, then attaches handlers. */
function renderGrid(grid) {
  if (!grid || !displayedHeadlines) return;
  const pinned = displayedHeadlines.filter(function(h) { return pinnedLinks.has(h.link); });
  const unpinned = displayedHeadlines.filter(function(h) { return !pinnedLinks.has(h.link); });
  grid.innerHTML = [...pinned, ...unpinned].map(function(h, i) { return renderCard(h, i * 120); }).join('');
  attachPinHandlers(grid);
  applyReducedMotion();
  // Keep the hero snapshot sentence in sync with what's on screen
  if (typeof updateSnapshot === 'function') updateSnapshot();
}

function attachPinHandlers(root) {
  root.querySelectorAll('.pin-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const link = btn.dataset.link;
      if (!link || !currentDate) return;
      if (pinnedLinks.has(link)) { pinnedLinks.delete(link); } else { pinnedLinks.add(link); }
      savePins(currentDate, pinnedLinks);
      renderGrid(document.querySelector('.headline-grid'));
    });
  });
}

// ── Refresh: pick a random different subset from the pool ────────────────────
function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function handleRefresh(grid) {
  if (!headlinePool.length || !grid) return;
  // Pinned articles are immune — preserve them and only rotate the unpinned slots
  const pinned = (displayedHeadlines ?? []).filter(function(h) { return pinnedLinks.has(h.link); });
  const pinnedSet = new Set(pinned.map(function(h) { return h.link; }));
  const currentLinks = new Set((displayedHeadlines ?? []).map(function(h) { return h.link; }));
  // Candidates: pool items not pinned; prefer ones not currently shown
  const unpinnedPool = headlinePool.filter(function(h) { return !pinnedSet.has(h.link); });
  const fresh = unpinnedPool.filter(function(h) { return !currentLinks.has(h.link); });
  const source = fresh.length >= 3 ? fresh : unpinnedPool;
  const next = shuffled(source).slice(0, 6);
  if (next.length === 0 && pinned.length === 0) return;
  // Pinned stay at the front; 6 fresh unpinned articles follow
  displayedHeadlines = [...pinned, ...next];
  renderGrid(grid);
}

// ── Reduced-motion support ────────────────────────────────────────────────────
function applyReducedMotion() {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.headline-card').forEach(function(card) {
    card.style.animation = 'none';
    card.style.opacity = '1';
    card.style.transform = 'none';
  });
}

// ── Initialise ────────────────────────────────────────────────────────────────
const grid = document.querySelector('.headline-grid');

if (grid && displayedHeadlines) {
  if (pinnedLinks.size > 0) {
    // Re-render so pinned articles sort to the top immediately
    renderGrid(grid);
  } else {
    // No pins yet — just wire up the server-rendered pin buttons
    attachPinHandlers(grid);
    applyReducedMotion();
  }
}

// Refresh button
const refreshBtn = document.getElementById('refresh-btn');
if (refreshBtn) {
  // Hide when the pool offers no additional variety
  const poolHasVariety = headlinePool.length > (displayedHeadlines?.length ?? 0);
  if (!poolHasVariety) {
    refreshBtn.style.display = 'none';
  } else {
    refreshBtn.addEventListener('click', function() {
      refreshBtn.disabled = true;
      const icon = refreshBtn.querySelector('.refresh-icon');
      if (icon) icon.classList.add('spinning');
      setTimeout(function() {
        handleRefresh(grid);
        refreshBtn.disabled = false;
        if (icon) icon.classList.remove('spinning');
      }, 280);
    });
  }
}

// Archive: annotate days that have pinned articles with a badge
document.querySelectorAll('.archive-list a, .archive-card a').forEach(function(link) {
  const href = link.getAttribute('href') ?? '';
  const match = href.match(/days\\/([0-9]{4}-[0-9]{2}-[0-9]{2})\\//);
  if (!match) return;
  const pins = loadPins(match[1]);
  if (pins.size === 0) return;
  const badge = document.createElement('span');
  badge.className = 'pin-badge';
  badge.textContent = pins.size + ' 📌';
  link.appendChild(badge);
});

// ── Archive date picker filter ─────────────────────────────────────────────────────
function initDatePicker(inputId, clearBtnId, itemSelector) {
  const picker = document.getElementById(inputId);
  const clearBtn = document.getElementById(clearBtnId);
  if (!picker) return;
  function applyFilter() {
    const val = picker.value; // 'YYYY-MM-DD' or ''
    document.querySelectorAll(itemSelector).forEach(function(item) {
      item.hidden = val.length > 0 && item.dataset.date !== val;
    });
    if (clearBtn) clearBtn.style.opacity = val ? '1' : '0.4';
  }
  picker.addEventListener('change', applyFilter);
  if (clearBtn) {
    clearBtn.style.opacity = '0.4';
    clearBtn.addEventListener('click', function() {
      picker.value = '';
      applyFilter();
    });
  }
}

initDatePicker('archive-search', 'archive-clear', '.archive-list li');
initDatePicker('archive-page-search', 'archive-page-clear', '.archive-cards article');

// ── Snapshot refresh: rebuild summary text from the current displayed headlines ──
function buildSnapshot(headlines) {
  if (!headlines || headlines.length === 0) return null;
  // Top 3 titles form the lead
  const lead = headlines.slice(0, 3).map(function(h) { return h.title.replace(/[.?!]+$/, ''); });
  function fmtList(parts) {
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] + ' and ' + parts[1];
    return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
  }
  const leadSentence = 'Today\u2019s pulse tracks ' + fmtList(lead) + '.';
  // Top-3 keywords across all titles (>4 chars, skip stop words)
  const stop = new Set(['about','after','alerts','amid','around','because','being','continue','email','follow','from','into','latest','newsletter','over','podcast','reading','signup','subscribe','that','their','there','these','this','today','updates','with','will','your']);
  const freq = new Map();
  headlines.forEach(function(h) {
    h.title.toLowerCase().split(/[^a-z0-9]+/).forEach(function(t) {
      if (t.length > 4 && !stop.has(t)) freq.set(t, (freq.get(t) ?? 0) + 1);
    });
  });
  const kws = [...freq.entries()].sort(function(a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); }).slice(0, 3).map(function(e) { return e[0]; });
  function shortSrc(name) {
    return name.replace(/^The\s+/i, '').replace(/\s+(?:Top\s+Stories?|World|News|Stories|International|Global)$/i, '').trim() || name;
  }
  const sources = [...new Set(headlines.map(function(h) { return shortSrc(h.sourceName); }))].slice(0, 4);
  const srcSentence = kws.length > 0
    ? 'Across ' + fmtList(sources) + ', the strongest repeated signals are ' + fmtList(kws) + '.'
    : 'Across ' + fmtList(sources) + ', the tone stays broad rather than concentrated on one single thread.';
  if (headlines.length < 5) return leadSentence + ' ' + srcSentence;
  const tails = headlines.slice(3, 5).map(function(h) { return h.title.replace(/[.?!]+$/, ''); });
  return leadSentence + ' ' + srcSentence + ' In the background, ' + fmtList(tails) + ' keep the wider picture in motion.';
}

/** Updates the hero summary paragraph with a freshly computed snapshot. */
function updateSnapshot() {
  if (!displayedHeadlines) return;
  const summaryEl = document.querySelector('.hero .summary');
  if (!summaryEl) return;
  const text = buildSnapshot(displayedHeadlines);
  if (text) summaryEl.textContent = text;
}

// Pulse timer (existing behaviour)
const timer = setInterval(function() {
  document.body.dataset.pulse = document.body.dataset.pulse === '1' ? '0' : '1';
}, 3600);
window.addEventListener('pagehide', function() { clearInterval(timer); });
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
