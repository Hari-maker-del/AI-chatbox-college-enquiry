# CampusOS — Your Digital Campus

CampusOS is an AI-powered college service platform that turns common campus workflows into one student-first experience.

## Core flow

**DISCOVER → REQUEST → APPLY / PROCESS → TRACK → COMPLETE**

Students can discover services, submit requests, track applications, receive notifications, message campus teams, review fee invoices, and use AI assistance. Administrators get operational views for requests, services, fees, courses, FAQs, support and campus activity.

## Technology

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase Auth, Postgres, Row Level Security and Realtime
- Supabase Edge Functions
- AI gateway integration for the CampusOS assistant
- Vitest

## Local development

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/Hari-maker-del/AI-chatbox-college-enquiry.git
cd AI-chatbox-college-enquiry
npm ci
npm run dev
```

Production build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Tests:

```bash
npm test
```

## Supabase

Apply migrations from `supabase/migrations` in timestamp order. The chat Edge Function requires the `LOVABLE_API_KEY` secret in the Supabase project.

The chat function is configured with JWT verification in `supabase/config.toml`.

## Security model

Student-facing records are protected with Supabase RLS and are scoped to the authenticated user. Administrative operations use the separate `user_roles` table rather than client-controlled role flags.

Payment records in this repository currently provide the application-side fee ledger and payment-session workflow. A production deployment still needs a real payment gateway, server-side webhook verification, and reconciliation before real money movement is enabled.

## Project structure

```
src/
  components/
    admin/        # Campus operations and administration
    campus/       # AI/campus intelligence
    student/      # Student services, notifications, fees and requests
  hooks/          # Authentication and UI hooks
  lib/            # CampusOS domain logic and AI intent handling
  pages/          # Student and admin application shells

supabase/
  functions/chat/ # Authenticated AI chat gateway
  migrations/     # Database schema, RLS and workflow migrations

public/campusos/ # CampusOS visual experience
```

## Important deployment note

College-specific admission rules, fees, contact details and deadlines should be entered into authoritative campus data before production use. The AI assistant is instructed not to invent institution-specific facts.

## Repository

urlGitHub repositoryhttps://github.com/Hari-maker-del/AI-chatbox-college-enquiry
