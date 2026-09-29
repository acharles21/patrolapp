# Patrol Command

Mobile-first PWA proof of concept for field operations, training, account information and technical support.

## Stack

- React + Vite
- Supabase Auth + Postgres + Row Level Security
- GitHub Pages deployment workflow
- Installable PWA foundation

## Backend

Supabase project: `ytfzkzgdshroudkbzerz`

The browser app uses a Supabase **publishable** key only. Never commit a service-role or secret key.

## Current modules

- Secure email/password authentication
- Role-backed user profiles
- Accounts and post orders
- Training resources
- Tech ticket submission and tracking
- Shops and devices
- Troubleshooting reference
- Announcements
- Audit-log foundation
- Mobile-first black / gold / white interface

## Run locally

```bash
npm install
npm run dev
```

## Deploy

The included GitHub Actions workflow builds and deploys the app to GitHub Pages on every push to `main`.

Repository path/base is configured as `/patrolapp/`.

## Security

Row Level Security is enabled in Supabase. Do not store shared passwords, access credentials, alarm codes, door codes, or other secrets directly in normal text fields. For a production rollout, company approval, data classification, device-management expectations, retention rules and incident-response ownership should be established before sensitive operational data is entered.
