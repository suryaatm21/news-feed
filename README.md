# News Feed

News Feed is a personal automated news digest that archives daily highlights while powering your GitHub contribution graph. 

It creates one dated Markdown snapshot per day, commits it to `main`, and publishes a mobile-friendly site with a deterministic visual theme that changes with every new entry.

## Features

- **Automated Retrieval**: Pulls from curated RSS feeds including BBC World, NPR, The Guardian, and Ars Technica.
- **Smart Filtering**: Deduplicates similar headlines and filters for fresh content (published within 36 hours).
- **Daily Archive**: Stores snapshots in `content/days/` and `data/days/` for a permanent personal record.
- **Continuous Activity**: Ensures your GitHub profile shows active daily contributions with automated, meaningful commits.
- **Dynamic Visuals**: A chaos-driven design system that selects unique layouts and palettes every day.

## Local Development

```bash
# Install dependencies
npm install

# Generate today's snapshot locally (ignores the 8:30 AM window)
ALLOW_OUTSIDE_WINDOW=1 npm run generate:daily

# Build the static site
SITE_BASE_PATH=/news-feed/ npm run build

# Preview the site
npx serve dist
```

## GitHub Automation Setup

1. **Create the Repo**: Create a public repository named `news-feed`.
2. **Push Code**: Push this folder to your `main` branch.
3. **Enable Pages**: Go to `Settings > Pages` and set the source to **GitHub Actions**.
4. **Configure Variables**: Go to `Settings > Secrets and variables > Actions > Variables` and add:
   - `GIT_COMMIT_EMAIL`: A verified email on your GitHub account (required for contribution credit).
   - `GIT_COMMIT_NAME`: (Optional) The name to use for the bot's commits.
5. **Set Permissions**: Ensure Actions have `Read and write permissions` under `Settings > Actions > General`.

## How it Works

The project is scheduled via GitHub Actions to run twice daily. It will only generate a new entry once per day (usually targeting the 8:30 AM New York window). If a manual run is triggered, it will bypass the time window and generate the entry immediately.

If the feeds are quiet or the network fails, the system generates a fallback entry to maintain your commit streak and site stability.

## License

This project is available under the [MIT License](LICENSE).
