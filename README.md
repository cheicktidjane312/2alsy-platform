# 2ALSY Platform - community web app (predictions, ticketing, event check-in)

Web app I built and maintain for **2ALSY**, the alumni association of the Lycée Scientifique
de Yamoussoukro (Côte d'Ivoire), where I am a volunteer administrator. It is used in production by the
association's members.

It started in June 2026 as a prediction game for the World Cup. In October I added a ticketing module for
the association's *Octobre Rose* event: registrations, PDF tickets with QR codes, and scanning at the door.

> Note: this is a public copy of the private production repo. Real phone numbers, e-mails and member
> names have been replaced with placeholders, and the commit history was not carried over.

## What it does

**Prediction game (World Cup 2026)**
- Member accounts (sign-up, login, password reset) with a member code.
- Predictions per match: outcome, exact score, first scorer, with prediction deadlines.
- Automatic scoring with bonuses and a time-based penalty for late predictions (`lib/scoring.ts`).
- Live leaderboard, prediction history, member dashboard.
- Admin area: matches, results entry, members, administrators.

**Ticketing and check-in (Octobre Rose 2026)**
- Public registration page: seat categories, member discount codes, Mobile Money payment proof
  (Wave / Orange Money screenshot or reference).
- Admin validation of payments; the participant then receives by e-mail a **PDF receipt with a QR code**
  generated server-side (`lib/billetterie/ticket-pdf.ts`).
- **Entrance scanning from any phone** (`/scan/<event>`): QR decoding in the browser (jsQR), green / orange /
  red result (valid, already used, unknown or unpaid), search by name or phone as a fallback. Door agents
  use a 6-digit code instead of an account; their sessions are signed with an HMAC secret.
- CSV export of participants, protected against spreadsheet formula injection.

## Technical choices

| Area | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| Data and auth | Supabase (PostgreSQL, Auth), row-level security policies in `supabase/schema.sql` |
| Validation | Zod schemas shared by forms and server routes (`lib/validations`) |
| Documents | PDF generation with `pdf-lib`, QR codes with `qrcode` |
| E-mails | Resend (transactional e-mails, HTML templates in `emails/`) |
| Tests | Vitest unit tests (validation, CSV safety, PDF generation) and a Playwright end-to-end scenario of the full ticketing flow (`tests/e2e`) |
| Hosting | Vercel |

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in your own Supabase project keys
npm run dev                  # http://localhost:3000
npm test                     # unit tests
```

For the database, run `supabase/schema.sql` and then the other SQL files in `supabase/` on your own
Supabase project. The ticketing setup is described in `docs/BILLETTERIE.md` (in French).

## Author

Ouessogo Cheick Mohamed Tidjane Traoré, founder of [FIERLAH Vertex](https://fierlah-vertex.com) (Abidjan / Dakar).
The app and its docs are in French, since that's what the members use.

© 2026 Ouessogo Traoré. Source shared for review purposes; not licensed for reuse.
