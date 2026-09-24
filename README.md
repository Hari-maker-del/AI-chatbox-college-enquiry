# AI College Enquiry Assistant

A production-oriented AI enquiry platform for students and parents. It combines React, Supabase Auth/Postgres/RLS, a secure Edge Function AI gateway, grounded college knowledge, persistent conversations, analytics, and browser voice.

## What is implemented

### Phase 1 — Security and correctness
- Authenticated AI endpoint
- Server-side provider key
- Request validation and message limits
- Per-user rate limiting
- Conversation ownership validation
- RLS for user data and admin knowledge
- Removal of hard-coded college answers from the active chat path

### Phase 2 — Grounded AI
- Knowledge-base table with categories and source URLs
- Retrieval from knowledge base, FAQs, courses and fees
- Low-temperature grounded generation
- Explicit unknown-information fallback
- Same-language response guidance for English, Tamil, Hindi, Telugu, Malayalam and Kannada
- Streaming responses

### Phase 3 — Product
- Persistent conversations
- Persistent messages
- Admin knowledge-base editor
- Admin analytics
- AI usage/error/latency tracking
- Notifications data model

### Phase 4 — Production readiness
- PostgreSQL indexes
- RLS policies
- least-privilege grants
- environment-based AI secret
- structured migrations
- production error paths
- build/lint/test scripts

### Phase 5 — Advanced experience
- Browser speech-to-text
- Browser text-to-speech
- Language selector for Indian languages
- Voice-first chat controls
- Conversation-aware AI responses

## Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth + PostgreSQL + Row Level Security
- Supabase Edge Functions
- Streaming AI gateway
- Vitest
- Web Speech API

## Local setup

1. Use Node.js 20+.
2. Run npm ci.
3. Create .env.local with:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
4. Apply Supabase migrations.
5. Configure the Edge Function secret LOVABLE_API_KEY.
6. Run npm run dev.

## Production setup

- Deploy the Supabase migrations.
- Deploy the chat Edge Function.
- Configure Auth email/redirect URLs.
- Replace the seed knowledge records with verified college information.
- Never put service-role or AI provider secrets in frontend code.
- Enable database backups.
- Monitor Edge Function logs and AI usage.
- Configure HTTPS and a production domain.
- Test voice support on the browsers/devices you intend to support.

## Verification commands

npm run lint
npm test
npm run build

## Architecture

Student browser
→ Supabase Auth
→ authenticated chat Edge Function
→ validation + rate limit
→ verified knowledge retrieval
→ AI gateway
→ streaming response
→ conversation/message storage
→ analytics

## Important data policy

The assistant is intentionally configured not to invent college-specific facts. The admin knowledge base should contain the authoritative admissions, course, fee, scholarship, hostel, placement, department, contact, calendar and policy information for the actual institution.
