import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { transcript } = await req.json();

  if (!transcript?.trim()) {
    return new Response(JSON.stringify({ error: "No transcript provided" }), { status: 400 });
  }

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an order parser for SliceAI, a pizza restaurant. Extract the order from this voice transcript and return a JSON object only — no explanation, no markdown.

Available options:
- Sizes: personal, small, medium, large, extra-large
- Crusts: thin, thick, stuffed, gluten-free, regular
- Toppings: pepperoni, sausage, ground beef, mushrooms, onions, peppers, olives, extra cheese, bacon, ham, pineapple, anchovies, jalapeños, spinach, tomatoes, ricotta
- Sides: garlic bread, wings, salad
- Drinks: Coke, Diet Coke, Sprite, Orange Fanta, Root Beer, Ginger Ale, Lemonade, Iced Tea (sizes: small, medium, large), Water (no size needed)
- Desserts: tiramisu, cannoli, chocolate lava cake, cheesecake

Transcript: "${transcript}"

Return JSON matching this structure:
{
  "pizzas": [{ "size": string, "crust": string, "toppings": string[], "quantity": number, "special_requests": string (optional) }],
  "other_items": [{ "name": string, "quantity": number, "size": "small"|"medium"|"large" (optional, for drinks), "special_requests": string (optional) }],
  "special_instructions": string (optional),
  "uncertain_items": string[] (flag genuinely ambiguous items — e.g. unknown menu items, unclear quantities, contradictory requests. Do NOT flag missing crust or size since those have defaults. Do NOT flag missing size for Water. DO flag "pizza toppings not specified" if a pizza is ordered with no toppings mentioned),
  "order_summary": string (a friendly one-sentence summary)
}

If no pizzas are mentioned, return an empty pizzas array. Infer reasonable defaults for size (medium) and crust (regular) if not specified. If an item is not on the menu, note it in special_instructions and omit it. Always map "hamburger" or "hamburger meat" to the "ground beef" topping — do not flag it as uncertain.`,
      },
    ],
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
