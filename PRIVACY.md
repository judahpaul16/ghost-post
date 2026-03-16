# Privacy Policy

Ghost Post is a Chrome extension that scores job postings for likelihood of being ghost jobs. This policy explains how it handles data.

## Data Collection

Ghost Post does **not** collect, store, or transmit any personal data. All processing happens locally in your browser.

The extension reads job posting page content (company name, job title, posting date) solely to score the posting. This data is never sent to any server operated by Ghost Post.

## API Requests

The extension makes requests to public third-party APIs to cross-reference job posting signals:

- SEC EDGAR (sec.gov) — employee headcount from 10-K filings
- Wayback Machine (web.archive.org) — URL age
- HN Algolia (hn.algolia.com) — hiring thread mentions
- Wikidata (wikidata.org) — parent company resolution
- layoffs.fyi — recent layoff data
- The Muse (themuse.com) — job listing verification

If you configure optional API keys, the extension also contacts:

- People Data Labs (peopledatalabs.com) — company size
- JSearch / RapidAPI (rapidapi.com) — cross-platform listing verification
- Your configured LLM endpoint — SEC filing text extraction

These requests contain only the company name or job URL being checked. No personal information, browsing history, or user identifiers are included.

## Local Storage

API keys and settings are stored in Chrome's local storage on your device. Cached API responses (SEC tickers, headcount data) are also stored locally to reduce redundant requests. This data never leaves your browser.

## Third Parties

Ghost Post does not sell, transfer, or share any user data with third parties. No analytics, tracking, or telemetry is included.

## Open Source

The complete source code is available at [github.com/judahpaul16/ghost-post](https://github.com/judahpaul16/ghost-post).

## Contact

For questions about this policy, open an issue on GitHub.
