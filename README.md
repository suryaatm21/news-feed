# Git Populate

Git Populate creates one dated Markdown snapshot per day, commits it to `main`, and turns the latest entry into a mobile-friendly GitHub Pages site with a deterministic visual surprise.

## What it does

- Pulls free public RSS feeds from NPR, BBC World, The Guardian World, and Ars Technica.
- Filters stale items older than 36 hours, deduplicates similar headlines, and writes a short local summary.
- Stores each day twice:
  - `content/days/YYYY-MM-DD.md`
  - `data/days/YYYY-MM-DD.json`
- Updates `data/latest.json` and `data/archive.json` for the static site.
- Publishes one stable bookmark URL plus immutable dated archive pages.

## Local commands

```bash
npm install
ALLOW_OUTSIDE_WINDOW=1 npm run generate:daily
SITE_BASE_PATH=/git-populate/ npm run build
npm test
```

## GitHub setup

1. Create a GitHub repository from this folder and push `main`.
2. Keep the repo private first if your plan supports Pages on private repositories. If not, switch the repo to public so the free Pages URL works cleanly.
3. In GitHub, go to `Settings > Pages` and set the source to `GitHub Actions`.
4. In `Settings > Secrets and variables > Actions > Variables`, add:
   - `GIT_COMMIT_EMAIL`: an email already linked to your GitHub account. This is required for contribution graph credit.
   - `GIT_COMMIT_NAME`: optional display name for the daily bot commit.
5. Enable Actions for the repository.
6. After the first successful Pages deploy, bookmark:
   - project site: `https://<your-user>.github.io/<repo>/`
   - user site repo: `https://<your-user>.github.io/`

## Schedule behavior

- The workflow is scheduled twice daily in UTC: `32 12 * * *` and `32 13 * * *`.
- The generator only writes a new entry when the local time in `America/New_York` lands in the 8:30 AM window.
- During daylight saving transitions, one of the two schedules matches 8:32 AM local time and the other safely no-ops.
- Manual runs via `workflow_dispatch` bypass the time window.

## Chaos system

- The content stays informative.
- The visuals change every day based on the date seed.
- The seed picks one of three layouts: `orbit`, `poster`, or `ticker`.
- The seed also picks one of six palettes: `sunprint`, `ember`, `lagoon`, `citrus`, `nocturne`, or `newsprint`.

## Notes

- GitHub contribution activity only updates after commits are pushed to the default branch on GitHub.
- The stable bookmark is the homepage. Historical entries are also available at `days/YYYY-MM-DD/`.
- If all feeds fail or return nothing current, the generator still writes a fallback daily entry so the contribution streak can continue.
