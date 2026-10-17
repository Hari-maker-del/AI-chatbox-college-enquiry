# ONYX implementation plan

## Repository audit

- Default branch at audit time: `main`
- Frontend: React 18, TypeScript, Vite, React Router
- UI: Tailwind CSS, shadcn/ui, Framer Motion and Lucide
- Backend/data: Supabase Auth, Postgres, Row Level Security, Realtime and Edge Functions
- Main React shell: `src/App.tsx`
- Student home: `src/pages/Index.tsx`
- Embedded campus interface: `public/campusos/index.html`, loaded in an iframe by the student home page
- AI assistant: `src/components/campus/CampusAI.tsx`
- Live notifications/workflow center: `src/components/student/CampusLiveCenter.tsx`
- Student service request actions are wired in `src/pages/Index.tsx` through labels inside the embedded interface. Preserve the important text hooks used for services, application tracking, campus navigation, certificate requests, exam-fee workflow, appointments, eligibility and support tickets.

## Design direction

- Brand: ONYX — AI Campus OS
- Visual language: midnight navy, charcoal, restrained blue/cyan light, subtle grid texture, elevated panels, clear typography and purposeful motion
- 3D direction: layered depth, perspective, hover lift and atmospheric lighting; keep the initial enhancement CSS-only so it does not add a heavy runtime dependency
- Responsive: keep current iframe sizing and React shell working at desktop and mobile widths
- Accessibility: preserve focus-visible states and support `prefers-reduced-motion`

## Changes in the first redesign pass

1. Updated the embedded interface document title and shell styling to a premium dark visual system.
2. Added subtle grid/ambient lighting, rounded elevated surfaces, restrained hover depth and responsive motion safeguards.
3. Updated the README project identity from CampusOS to ONYX and documented the existing architecture.

## Next implementation phases

### Phase 2 — Rendered UI review
- Run the application locally and inspect the iframe contents at desktop, tablet and mobile breakpoints.
- Tune selectors against the actual rendered markup rather than using broad speculative selectors.
- Confirm existing labels and click handlers still work.

### Phase 3 — Homepage 3D hero
- Add a lightweight campus scene using CSS perspective and layered architecture first.
- If a real-time 3D model is required after performance testing, evaluate React Three Fiber/Drei and lazy-load it.
- Provide a static/mobile fallback and reduced-motion behavior.

### Phase 4 — Dashboard and services
- Improve student/admin surfaces without changing database contracts.
- Preserve request tracking, notifications, fees, appointments, eligibility, support tickets and authentication.
- Keep data operations in existing service/domain modules.

### Phase 5 — AI assistant
- Keep the existing authenticated assistant and Tamil/English speech workflow.
- Only label retrieval-augmented generation as complete after a real retrieval pipeline is implemented and tested.

### Phase 6 — Verification
Run:
```bash
npm ci
npm run lint
npm test
npm run build
```
Then manually test signed-out and signed-in experiences, RLS-scoped requests, admin permissions, iframe click hooks, keyboard navigation, mobile layouts, and browser console errors.

## Risks / guardrails

- The main campus UI is compressed/embedded in one HTML document; edits must preserve its embedded payload and click labels.
- Do not replace the existing project scaffold or Supabase configuration.
- Do not expose service-role credentials in frontend code.
- Do not represent a UI-only payment flow as real payment processing.
- Do not claim a production build passed until it is run in a Node environment.
