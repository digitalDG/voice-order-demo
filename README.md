# SliceAI — Voice-Powered Pizza Ordering

A portfolio demo showcasing real-world AI engineering: voice input, LLM-based structured output extraction, streaming responses, and confidence-aware parsing.

**Live demo:** https://voice-order-demo.vercel.app

---

## What it does

Speak a pizza order naturally. SliceAI transcribes your voice, sends it to Claude, and returns a fully structured order — including pizza size, crust, toppings, sides, drinks, and desserts — displayed as a clean order confirmation.

Example: *"I'd like a large pepperoni thin crust with extra cheese, a side of garlic bread, and a large Sprite"*

---

## AI Engineering Highlights

### Streaming responses
Uses the Anthropic SDK's streaming API (`client.messages.stream`) so the UI can respond as soon as Claude starts generating, reducing perceived latency.

### Structured output with Zod validation
Claude returns JSON conforming to a strict schema (pizzas, sizes, crusts, toppings, sides, drinks with sizes, desserts). Output is validated client-side with Zod — malformed responses are caught and surfaced gracefully.

### Confidence-aware parsing
Claude flags genuinely ambiguous inputs (unknown menu items, contradictory requests) in an `uncertain_items` field. These surface as a "Needs clarification" warning in the UI — the system is transparent about uncertainty rather than silently guessing.

### Prompt engineering with menu context
The system prompt includes the full menu (sizes, crusts, toppings, drinks, desserts) so Claude can validate items against what's actually available. Off-menu items are flagged or omitted. Common aliases (e.g. "hamburger" → ground beef) are explicitly handled.

### Silence detection
Voice input uses the Web Speech API with a 2-second silence timer — the order auto-submits when the user stops speaking, no button press required.

---

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Claude claude-sonnet-4-6** via Anthropic SDK (streaming)
- **Zod** — runtime schema validation
- **Web Speech API** — browser-native voice transcription
- **Tailwind CSS** — styling
- **Vercel** — deployment

---

## Architecture

```
Browser (Web Speech API)
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
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome (Chrome has the best Web Speech API support).

---

## Project Structure

```
app/
  api/parse-order/route.ts   # Streaming Claude API route
  components/
    VoiceInput.tsx            # Web Speech API + silence detection
    OrderSummary.tsx          # Order confirmation card
    OrderHistory.tsx          # Session order history
  page.tsx                   # Main page + state machine
lib/
  schema.ts                  # Shared Zod schemas + types
```

---

*Built as a portfolio demo to showcase Voice AI + LLM engineering patterns.*
