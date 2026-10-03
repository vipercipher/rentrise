# RentRise.au

**Got a rent increase notice? Check in two minutes whether it's allowed.**

RentRise is a free website that helps Australian renters check whether a rent increase follows the law in their state. It turns each state's official tenancy rules into a short set of questions, then gives a clear answer, the key dates, and a polite message you can send to your agent or landlord.

🔗 **Live site:** https://rentrise.au

---

## Why we made this

Rent increases are one of the most stressful moments of renting, and the rules are hard to pin down:

- **The rules differ in every state.** How often rent can go up, how much notice is needed and what a lease must say all depend on where you live.
- **The rules keep changing.** Queensland and New South Wales have both changed their rent increase laws in the last few years.
- **Online advice contradicts itself.** Many articles that rank well in search results are out of date, so renters searching for answers often get conflicting information.
- **The official information is there, but it's general.** Government pages explain the rules, but they don't work out what they mean for *your* dates and *your* lease.

We built RentRise to close that gap. It does the date maths for you, explains the result in plain English and points you to the official source, so you can respond to your agent with confidence.

## Who it helps

- **Renters** who have just received a rent increase notice and want to know whether it's valid before they agree to it or pay it.
- **People new to renting in Australia,** including students and recent arrivals, who don't yet know their rights.
- **Family and friends** helping someone check a notice, such as an adult child helping an older parent.
- **Tenant advocates, community workers and support services** who want a quick, consistent way to check timing rules with a client.
- **Landlords and property managers** who want to make sure a notice they send follows the rules.

## How to use it

1. **Go to [rentrise.au](https://rentrise.au) and pick your state.** Queensland, New South Wales and Victoria are available now.
2. **Answer a few questions from your notice and lease,** including:
   - your type of lease (periodic or fixed term)
   - when your current rent started, or your last increase
   - when you received the notice, and when the new rent starts
   - whether the notice was in writing
   - your current and proposed weekly rent
3. **Read your result.** You'll see:
   - ✅ or ❌ for each rule, with a short explanation
   - the **earliest date** the new rent can legally start
   - a timeline of your key dates
   - how much the increase costs per week and per year
   - your **deadline to challenge** an excessive increase (QCAT, NCAT or a Consumer Affairs Victoria rent assessment)
4. **Take action.** Copy the ready-to-write message to your agent or landlord, fill in your details and send it by email so you have a record. If you need advice about your situation, the page lists free official help services in your state.

Want the rules first? Each state has a plain-English guide:
[Queensland rules](https://rentrise.au/qld/rules/) · [NSW rules](https://rentrise.au/nsw/rules/) · [Victoria rules](https://rentrise.au/vic/rules/)

## States covered

| State | Checker | Rules guide | Based on |
|---|---|---|---|
| Queensland | [rentrise.au/qld](https://rentrise.au/qld/) | [rentrise.au/qld/rules](https://rentrise.au/qld/rules/) | Residential Tenancies Authority (RTA) |
| New South Wales | [rentrise.au/nsw](https://rentrise.au/nsw/) | [rentrise.au/nsw/rules](https://rentrise.au/nsw/rules/) | NSW Fair Trading and the Tenants' Union of NSW |
| Victoria | [rentrise.au/vic](https://rentrise.au/vic/) | [rentrise.au/vic/rules](https://rentrise.au/vic/rules/) | Victorian Government, Rental Dispute Resolution Victoria and Tenants Victoria |

Other states are coming. You can [request your state](https://rentrise.au/contact/?topic=state) on the site.

## Privacy by design

- **What you enter stays on your device.** All calculations run in your browser. Your dates and rent amounts are never sent to us or anyone else.
- **No accounts, no ads, no tracking cookies.** We use privacy-friendly, cookie-free visitor statistics.
- **Self-hosted fonts and strict security headers** keep other companies from seeing your visit.
- The contact form is the only place we receive personal information, and only if you choose to use it. See our [Privacy Policy](https://rentrise.au/privacy/).

## Accuracy

Every rule on RentRise comes from the official state tenancy authority or a recognised tenant advice service, and each page shows the date its rules were last checked. If something looks wrong or out of date, please [report a mistake](https://rentrise.au/contact/?topic=mistake) and we'll check it against the official source.

## For developers

RentRise is a static site written in plain HTML, CSS and JavaScript, with no frameworks and no build step. It's hosted on Cloudflare Pages.

```
├── index.html            Home page and state picker
├── qld/                  Queensland checker and rules guide
├── nsw/                  NSW checker and rules guide
├── vic/                  Victoria checker and rules guide
├── about/                About page
├── contact/              Contact page
├── privacy/              Privacy policy
├── thanks/               Contact form confirmation
├── assets/
│   ├── site.css          Shared styles (light and dark themes)
│   ├── qld-checker.js    Queensland rules logic
│   ├── nsw-checker.js    NSW rules logic
│   ├── vic-checker.js    Victoria rules logic
│   ├── calendar.js       "Add to calendar" file builder
│   ├── contact.js        Contact form (Web3Forms + hCaptcha)
│   └── fonts/            Self-hosted fonts (SIL Open Font License)
├── _headers              Security headers for Cloudflare Pages
├── robots.txt
└── sitemap.xml
```

To run it locally, open the folder in a terminal and start any static server, for example `python -m http.server`, then visit `http://localhost:8000`.

## Disclaimer

RentRise provides general information, not legal advice. It is independent and not affiliated with any government agency or tenancy authority. For advice about your own situation, contact your state's tenancy authority or a free tenant advice service.

## Contact

Questions, feedback or a state request? Use the [contact page](https://rentrise.au/contact/) or email **hello@rentrise.au**.

© 2026 RentRise.au. All rights reserved.
