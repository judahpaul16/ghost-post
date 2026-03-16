# Chrome Web Store Listing

## Category
Productivity

## Language
English

## Description

Ghost Post scores job postings for likelihood of being ghost jobs — listings that companies post with no intention of filling.

It cross-references each posting against 10+ independent data sources to produce a score from 0 (likely real) to 100 (likely ghost). All analysis runs locally in your browser. No data is sent to any backend server.

WHAT IT CHECKS

- Posting age: How long the listing has been up. Older posts are more suspicious.
- Wayback Machine: Whether the URL has existed for an unusually long time.
- ATS verification: Whether the company has an active careers page on Greenhouse, Lever, or Ashby.
- HN "Who is Hiring?": Whether the company appears in Hacker News monthly hiring threads.
- Company size: Employee count via People Data Labs. Very small companies posting aggressively can be a red flag.
- SEC headcount trends: Year-over-year employee count from SEC 10-K filings. A company cutting 15% of its workforce probably isn't hiring for your role.
- Recent layoffs: Cross-references layoffs.fyi for recent workforce reductions.
- Cross-platform listings: Checks if the job appears on other platforms via Google for Jobs.
- The Muse: Whether the company actively promotes listings on The Muse.
- Structured data: Whether the posting includes proper schema.org JobPosting markup.

HOW IT WORKS

1. Visit any job posting on LinkedIn, Indeed, Greenhouse, Lever, Workday, or any supported job board.
2. Ghost Post automatically extracts the company name, job title, and posting date.
3. It runs all checks in parallel and displays a color-coded badge directly on the page.
4. Click the badge or open the popup to see a detailed breakdown of every signal.
5. Click any signal to view its source data.

HEADCOUNT TREND CHARTS

Click the SEC headcount signal to open an interactive chart showing up to 10 years of employee count data with year-over-year change overlay. Subsidiary brands (YouTube, GitHub, Instagram, etc.) automatically resolve to their SEC-filing parent company.

CUSTOM JOB BOARDS

Works on any job board. For sites not supported by default, add custom CSS selectors in the options page to tell Ghost Post where to find the company name, job title, and posting date.

PRIVACY

- All processing happens locally in your browser
- No accounts, no tracking, no analytics
- API keys are stored in Chrome's local storage and never leave your machine
- Optional API keys unlock premium data sources (People Data Labs, JSearch) but are not required

6 of 10 data sources work with zero configuration. Add API keys for the remaining sources to get a more complete picture.

Open source: https://github.com/judahpaul16/ghost-post
