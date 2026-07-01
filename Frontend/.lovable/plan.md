## Amicorp AI Structuring Assistant

Frontend for a premium corporate advisory portal. Users describe a structuring goal, get AI-ranked entity recommendations, inspect fee breakdowns and org diagrams, and chat with a streaming AI assistant. Includes static marketing pages, toast notifications, and premium micro-animations throughout.

## Design

Direction: **Advisory command center** (selected).
- Palette: navy `#0f1623` / `#0a1019`, amber `#e05a2b`, off-white `#f2f4f8`, white.
- Type: Playfair Display (serif headings) + Inter (sans body), via `@fontsource` packages.
- Layout: sticky top nav, 3-col sidebar / 9-col main on dashboard, floating chat bottom-right.

Tokens go into `src/styles.css` under `@theme` (`--color-navy-950`, `--color-navy-900`, `--color-amber-600`, `--color-off-white`) so utilities like `bg-navy-900` / `text-amber-600` work everywhere. Custom keyframes for `fade-in-up`, `scale-in`, `shimmer`, and staggered card reveals.

## Routes

- `/auth` — Login card. Hardcoded creds `amicorp` / `Admin@123`. Success toast → set `localStorage.amicorp_auth = "true"` → navigate to `/`. Error toast on bad creds.
- `/` — Guarded dashboard (hero prompt + recommendations + chat).
- `/services` — Corporate services overview: entity formation, fund administration, trust & fiduciary, compliance, tax structuring.
- `/jurisdictions` — Grid of jurisdictions (BVI, Cayman, Singapore, Luxembourg, UAE, Hong Kong, etc.) with hero, filters by region, and detail cards.
- `/structures` — Catalog of entity structures (IBC, VCC, Exempted Company, Trust, Foundation, LLC) with benefits and comparison table.
- `/about` — Company narrative, values, editorial imagery, leadership.
- `/contact` — Contact form (name, email, company, message) that shows a success toast on submit; also office locations and "Book a Call" CTA.

All non-auth pages share the top nav via a shared `AppLayout` wrapper. Auth guard redirects to `/auth` when `localStorage.amicorp_auth !== "true"`. Each route defines its own `head()` metadata (title, description, og:title, og:description).

## Shared components

- `AppHeader` — sticky nav with logo, tab links (active state), Book a Call, Logout. Amber underline slide on hover.
- `AppFooter` — three-column footer with company, resources, legal links and small print.
- `PageHero` — reusable serif hero block for static pages.
- `SidebarPanel` — Parameters chips + Market Pulse card (dashboard only).
- `PromptHero` — textarea + amber "Generate Analysis" button with loading spinner.
- `RecommendationCard` — jurisdiction badge, match score, meta grid (setup time, setup cost, annual cost, privacy), key benefits, Ideal For (blue badges), Categories (grey badges), Legal Framework / Liability / Public Register row, Estimate + Diagram buttons. Staggered fade-in on mount.
- `NoMatchState` — fallback when `noMatch: true`, with support-email confirmation copy.
- `EstimateModal` — shadcn Dialog with fee breakdown table.
- `DiagramModal` — shadcn Dialog with inline SVG org chart (Client/UBO → Entity → Subsidiary / Bank / Assets) + "Contact Specialist" button.
- `ChatWidget` — floating bubble → panel with suggestion chips, scrollable history, streamed assistant replies, input.
- `BookCallModal` — reused by "Book a Call" buttons, shows contact form + toast.

## Animations & polish

- Global: page transitions via `animate-fade-in-up` on route roots.
- Cards: staggered reveal (delay per index).
- Buttons: subtle scale on hover, amber glow on primary.
- Chat: message bubble scale-in; typing shimmer while awaiting first chunk.
- Modals: shadcn default scale/fade.
- Nav links: animated underline (`.story-link`-style).
- Loading spinner on prompt submission with "Analyzing…" label.

## Toasts (sonner)

- Login success/failure, logout confirmation.
- Recommendation errors (network / API failure).
- No-match fallback ("Your request has been sent to our advisors").
- Contact form submitted.
- Chat errors.
- Book a Call submitted.

`<Toaster />` mounted once in `__root.tsx` with theme-matched styling (navy background, amber accent).

## Backend proxy

FastAPI base: `https://proxyllm-6khq.onrender.com` (stored in `process.env.FASTAPI_BASE_URL` with fallback constant). Two TanStack server routes proxy from the browser to avoid CORS:

- `src/routes/api/recommend.ts` — `POST` forwards `{ query }` to FastAPI `/api/recommend`, returns JSON matching the spec's response shape.
- `src/routes/api/chat.ts` — `POST` forwards `{ message, conversation_id, stream: true }` to FastAPI `/chat` and pipes the SSE `ReadableStream` back to the browser with `text/event-stream` headers.

Chat request body (per updated spec):
```json
{ "message": "string", "conversation_id": "string | null", "stream": true }
```
`conversation_id` is captured from the first SSE chunk and reused for follow-up messages in the same session; a "New conversation" control clears it. `stream: true` is always sent by the widget; the response is parsed line-by-line for `data: …` payloads, extracting `choices[0].delta.content` deltas until `data: [DONE]`.

## Technical notes

- Add `@fontsource/playfair-display` and `@fontsource/inter`, import in `src/router.tsx`.
- Replace placeholder `src/routes/index.tsx`.
- Hardcoded localStorage auth flag is intentional (demo, per user confirmation).
- shadcn primitives used: Dialog, Button, Input, Textarea, Badge, ScrollArea, Sonner Toaster, Separator, Card.
- No Lovable Cloud, no database. Pure frontend + thin proxy routes.
