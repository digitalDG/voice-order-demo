# SliceAI — Voice-Powered Pizza Ordering

A portfolio demo showcasing real-world AI engineering: real-time voice transcription, LLM-based structured output extraction, streaming responses, and confidence-aware parsing.

**Live demo:** https://voice-order-demo.vercel.app

---

## What it does

Speak a pizza order naturally. SliceAI streams your voice to Deepgram for real-time transcription, sends the result to Claude, and returns a fully structured order — including pizza size, crust, toppings, sides, drinks, and desserts — displayed as a clean order confirmation.

Example: *"I'd like a large pepperoni thin crust with extra cheese, a side of garlic bread, and a large Sprite"*

Press **Speak**, wait for the beep, then say your order. The mic stops automatically when you finish speaking.

---

## AI Engineering Highlights

### Real-time voice transcription via Deepgram
Uses Deepgram's WebSocket streaming API (nova-3 model) for low-latency, cross-browser speech-to-text. A pre-warmed WebSocket connection and server-side token caching minimize connection latency. A soft ready tone signals when the mic is open and listening.

### Streaming responses
Uses the Anthropic SDK's streaming API (`client.messages.stream`) so the UI responds as soon as Claude starts generating, reducing perceived latency.

### Structured output with Zod validation
Claude returns JSON conforming to a strict schema (pizzas, sizes, crusts, toppings, sides, drinks with sizes, desserts). Output is validated with Zod — malformed or null responses are caught and surfaced gracefully.

### Confidence-aware parsing
Claude flags genuinely ambiguous inputs (unknown menu items, contradictory requests, missing toppings) in an `uncertain_items` field. These surface as a "Needs clarification" warning — the system is transparent about uncertainty rather than silently guessing.

### Prompt engineering with menu context
The system prompt includes the full menu so Claude can validate items against what's actually available. Off-menu items are flagged or omitted. Common aliases (e.g. "hamburger" → ground beef) are explicitly handled.

### Secure token proxying
Deepgram API keys never reach the client. A Next.js API route creates short-lived temp keys (5-minute TTL, `usage:write` scope only) and caches them server-side to avoid per-request latency.

---

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Claude claude-sonnet-4-6** via Anthropic SDK (streaming)
- **Deepgram** nova-3 — real-time WebSocket voice transcription
- **Zod** — runtime schema validation
- **Tailwind CSS** — styling
- **Vercel** — deployment

---

## Architecture

```
Browser (MediaRecorder)
  → audio stream (WebSocket)
    → Deepgram nova-3 (real-time transcription)
      → transcript text
        → Next.js API route (/api/parse-order)
          → Anthropic SDK streaming call
            → streamed JSON response
              → Zod schema validation
                → React state update → UI render
```

---

## Getting Started

```bash
npm install
```

Create `.env.local`:
```
ANTHROPIC_API_KEY=your_key_here
DEEPGRAM_API_KEY=your_key_here
DEEPGRAM_PROJECT_ID=your_project_id_here
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Works on Chrome, Edge, Firefox, and Safari (desktop and mobile).

---

## Project Structure

```
app/
  api/
    parse-order/route.ts      # Streaming Claude API route
    deepgram-token/route.ts   # Secure temp key proxy with caching
  components/
    VoiceInput.tsx            # Deepgram WebSocket + silence detection
    OrderSummary.tsx          # Order confirmation card
    OrderHistory.tsx          # Session order history
  page.tsx                   # Main page + state machine
lib/
  schema.ts                  # Shared Zod schemas + types
```

---

*Built as a portfolio demo to showcase Voice AI + LLM engineering patterns.*
