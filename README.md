# Ghost Post <img src="public/icons/icon-128.png" width="32" height="32" alt="Ghost Post logo">

[![Release](https://img.shields.io/github/v/release/judahpaul16/ghost-post?style=flat-square)](https://github.com/judahpaul16/ghost-post/tags)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![Ghost Post](contrib/webstore/promo-marquee-1400x560.png)

Chrome extension that scores job postings for likelihood of being ghost jobs.

## Features

- Scores job postings 0–100 based on multiple cross-referenced signals
- Inline badges on job list pages (LinkedIn, Indeed, Greenhouse, Lever, Workday)
- Clickable signals with links to source data
- Custom page support — define CSS selectors for any unsupported job board
- Checks posting age, structured data, ATS presence, Wayback Machine history, HN hiring threads, company size, headcount trends (SEC 10-K filings), recent layoffs, cross-platform job listings, and The Muse partner status
- Headcount trend chart page — click the signal to see up to 10 years of employee count data with YoY change overlay
- Brand→parent company resolution — subsidiaries (e.g., YouTube, GitHub) automatically resolve to their SEC-filing parent (Alphabet, Microsoft) via Wikidata and SEC EFTS
- All processing in-browser — no backend server
- Bring your own API keys for premium data sources

## Install

### From Source

```bash
git clone https://github.com/judahpaul16/ghost-post.git
cd ghost-post
npm install
npm run build
```

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist` folder

### Chrome Web Store

Coming soon.

## Configuration

Open the extension options page to add API keys:

| Source | Key Required | Free Tier | What It Checks |
|--------|-------------|-----------|----------------|
| Wayback Machine | No | Unlimited | How long the posting URL has existed |
| HN Algolia | No | Unlimited | Company presence in "Who is Hiring?" threads |
| ATS Verification | No | Unlimited | Whether the company has a careers page on Greenhouse, Lever, or Ashby |
| The Muse | No | Unlimited | Whether the company actively promotes listings on The Muse |
| layoffs.fyi | No | Unlimited | Recent company layoffs |
| People Data Labs | Yes | 100/mo | Company size and employee count |
| JSearch (RapidAPI) | Yes | 500/mo | Cross-reference listings across job platforms via Google for Jobs |
| SEC Headcount | No | Unlimited | YoY employee count trend from SEC 10-K filings (LLM optional) |

Get your keys:
- **PDL**: [dashboard.peopledatalabs.com](https://dashboard.peopledatalabs.com/api-keys) — sign up for a free account
- **JSearch**: [rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) — subscribe to the free plan
- **LLM** (optional): Any OpenAI-compatible endpoint ([LiteLLM](https://docs.litellm.ai/), OpenAI, etc.) — improves SEC headcount extraction accuracy. Falls back to regex without a key. Configure base URL, model, and API key in settings

### Custom Pages

For job boards not supported by default, add custom page configurations in the options page. Define CSS selectors for the company name, job title, posting date, and optionally job card elements for list pages. Use `*` as a wildcard in URL patterns (e.g., `careers.example.com/*`).

## Scoring

| Signal | Points | Source |
|--------|--------|--------|
| Posted < 14 days ago | -5 | Page data |
| Verified on ATS careers page | -5 | ATS verification |
| Found in HN "Who is Hiring?" | -5 | HN Algolia |
| Active listings on job platforms | -5 | JSearch |
| Active listings on The Muse | -5 | The Muse |
| No structured data | +5 | Page data |
| No expiration date | +10 | Page data |
| No active listings on job platforms | +10 | JSearch |
| Posted > 30 days ago | +15 | Page data |
| URL first seen > 60 days ago | +15 | Wayback Machine |
| No careers page on any ATS | +20 | ATS verification |
| Very small company (< 10 employees) | +10 | PDL |
| Posted > 60 days ago | +25 | Page data |
| Headcount growing 10%+ YoY | -5 | SEC EDGAR |
| Headcount declined 5–15% YoY | +10 | SEC EDGAR |
| Headcount dropped 15%+ YoY | +15 | SEC EDGAR |
| Recent layoffs | +25 | layoffs.fyi |

Score is clamped 0–100. **Ranges**: 0–25 (green, likely real) · 26–50 (yellow, caution) · 51–100 (red, likely ghost)

## Development

```bash
npm install
npm run dev
```

Load the extension in Chrome from the generated `dist` folder. Vite + CRXJS provides HMR during development.

## License

[MIT](LICENSE)
