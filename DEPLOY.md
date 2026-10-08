# CampusOS deployment

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Install dependencies:

```bash
npm ci
```

4. Validate:

```bash
npm run lint
npm run build
```

## Supabase

Apply migrations in `supabase/migrations/` to the production project.

Deploy the authenticated chat function:

```bash
supabase functions deploy chat
supabase secrets set LOVABLE_API_KEY=YOUR_KEY
```

The chat function has JWT verification enabled. The frontend must send the user's Supabase session access token; the public publishable key is not an authentication credential.

## Frontend hosting

Build with:

```bash
npm run build
```

Deploy the generated `dist/` directory to Vercel, Netlify, or another static host. Configure the same two `VITE_*` variables in the hosting provider.

For production, use your production Supabase project and configure Supabase Auth redirect URLs for the deployed domain.

## Payments

The current fee flow is a database-backed invoice/payment ledger and payment intent flow. It does **not** move real money until a payment gateway and verified webhook/reconciliation flow are integrated.

## Production checklist

- [ ] Production Supabase project
- [ ] Production migrations applied
- [ ] `LOVABLE_API_KEY` configured as an Edge Function secret
- [ ] Auth redirect URLs configured
- [ ] Authoritative college courses, fees, FAQs and contact data seeded
- [ ] Real payment gateway + webhook configured before collecting money
- [ ] Rate limiting/WAF enabled for AI traffic
- [ ] Error monitoring enabled
