# SOLITAIRE Legal & Technical & Credit

A centralized underwriting portal for managing legal, technical, and credit verification workflows on loan cases — built for **Solitaire Finz Mart**, a loan DSA and financial advisory firm.

🔗 **Live:** [sachink24.github.io/SOLITAIRE-Legal-Technical-Credit](https://sachink24.github.io/SOLITAIRE-Legal-Technical-Credit/)

---

## Overview

SOLITAIRE Legal & Technical & Credit is a role-based, multi-portal web app that lets an underwriting team collect documents, assign cases, track property/legal/technical/credit verification, generate reports, and monitor status from application to final sanction — all backed by Supabase.

It works alongside the companion [`associate-app`](https://github.com/Sachink24/associate-app) repo, which handles lead intake, and shares the same Supabase project and `sachink24.github.io` origin for session continuity across portals.

## Features

- **Role-based portals** — dedicated pages for Admin, Legal, Technical, and Credit associates, each gated by Supabase Auth
- **Case queue & workflow** — searchable case queue with approve / rework / reject actions and a full `workflow_history` audit trail
- **Report generation** — Legal, Technical, and Credit report forms with versioning (`version` counter) and rework banners on resubmission
- **KYC / unlock-gate flow** — role-specific document gate chains before a case can be actioned, with an admin bypass
- **Portfolio dashboard** — live KPI stat cards sourced directly from Supabase
- **Sanction tracking** — dedicated `sanctions` table for bank/NBFC sanction outcomes
- **Diamond Noir design system** — consistent black/gold visual identity (Cinzel / Cormorant Garamond typography) across all pages
- **Hardened security** — authenticated, role-scoped Row Level Security (RLS) policies, a `has_permission()` helper, and security-definer functions with pinned `search_path`

## Pages

| File | Purpose |
|---|---|
| `index.html` | Landing page |
| `login.html` | Auth entry point (Supabase Auth) |
| `admin.html` | Admin portal — portfolio stats, case queue, approve/rework/reject, audit timeline |
| `legal.html` | Legal Associate report & verification workflow |
| `technical.html` | Technical Associate report & verification workflow |
| `credit.html` | Credit Associate report & underwriting workflow |
| `auth-guard.js` | Shared session guard enforcing Supabase Auth across all portals |
| `supabase-config.js` | Centralized Supabase client & `SolitaireDB` data-access helpers |
| `privacy.html` | Privacy policy |
| `auth-test.html` | Temporary auth/session diagnostic page (safe to remove after testing) |

## Tech Stack

- **Frontend:** Static HTML/CSS/JS (no build step), Diamond Noir design system
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL, Auth, Storage, RLS)
- **Hosting:** GitHub Pages (`sachink24.github.io`)

## Data Model (Supabase)

Key tables/entities include:

- `leads` — case records extended with credit-workflow columns
- `evaluation_reports` — legal/technical/credit reports with `lead_id` FK, lifecycle status, and `version`
- `workflow_history` — append-only audit log of case actions
- `sanctions` — bank/NBFC sanction outcomes
- `legal_team`, `technical_team`, `credit_team`, `business_associates` — role tables used for auth/permission scoping
- `has_permission()` — security-definer helper used to enforce role-scoped access in RLS policies

## Authentication & Security

- All portals require an authenticated Supabase Auth session via `auth-guard.js`
- RLS policies are **authenticated-only and role-scoped** — no open anon access on protected tables
- Permissions are explicitly seeded and checked through `has_permission()`
- Security-definer functions use a pinned `search_path` to prevent search-path hijacking
- See [`SECURITY.md`](./SECURITY.md) for the full security policy

## Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/Sachink24/SOLITAIRE-Legal-Technical-Credit.git
   ```
2. Update `supabase-config.js` with your Supabase project URL and anon key.
3. Serve the folder as static files (or open directly) — no build step required.
4. Sign in via `login.html` using an existing Associate App Auth user.
5. (Optional) Use `auth-test.html` to verify `session_exists: true` and a valid `auth_uid` after login — remove it before shipping to production.

## Related Repos

- [`associate-app`](https://github.com/Sachink24/associate-app) — lead intake, business associate workflow, and CRM

## License / Ownership

Proprietary — built for internal use by Solitaire Finz Mart.
