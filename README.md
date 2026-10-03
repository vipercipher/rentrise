# RentRise.au

Free tools that help Australian renters check whether a rent increase follows the rules in their state.

**Live site:** https://rentrise.au

## What it does

Renters answer a few questions about their rent increase notice and get:

- a clear verdict on whether the increase follows the state's rules
- the earliest date the new rent can legally start
- their deadline to dispute an excessive increase at the tribunal
- a ready-to-send message for their agent or landlord

## States covered

| State | Checker | Rules guide | Official source |
|---|---|---|---|
| Queensland | [/qld/](https://rentrise.au/qld/) | [/qld/rules/](https://rentrise.au/qld/rules/) | Residential Tenancies Authority |
| New South Wales | [/nsw/](https://rentrise.au/nsw/) | [/nsw/rules/](https://rentrise.au/nsw/rules/) | NSW Fair Trading, Tenants' Union of NSW |

## Privacy and security

- All checker calculations run in the visitor's browser. Nothing they enter is sent anywhere.
- Fonts are self-hosted, with no third-party trackers or ads.
- Security headers (CSP, HSTS and others) are set in `_headers`.
- The contact form uses Web3Forms with hCaptcha, loaded only when the form is used.

## Tech

Plain HTML, CSS and JavaScript with no build step, hosted on Cloudflare Pages.

```
├── index.html            Home page
├── qld/                  Queensland checker and rules guide
├── nsw/                  NSW checker and rules guide
├── contact/              Contact page
├── privacy/              Privacy policy
├── thanks/               Contact form confirmation
├── assets/
│   ├── site.css          Shared styles (light and dark themes)
│   ├── qld-checker.js    Queensland rules logic
│   ├── nsw-checker.js    NSW rules logic
│   ├── contact.js        Contact form handling
│   └── fonts/            Self-hosted fonts (SIL Open Font License)
├── _headers              Security headers for Cloudflare Pages
├── robots.txt
└── sitemap.xml
```

## Disclaimer

RentRise provides general information, not legal advice. It is independent and not affiliated with any government agency or tenancy authority.

© 2026 RentRise.au. All rights reserved.
