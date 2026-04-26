"use client";

import { useState } from "react";
import VoiceInput from "./components/VoiceInput";
import OrderSummary from "./components/OrderSummary";
import OrderHistory from "./components/OrderHistory";
import { OrderSchema, OrderWithMeta } from "../lib/schema";

type State = "idle" | "loading" | "streaming" | "success" | "error";

const MENU = {
  sizes: ["Personal", "Small", "Medium", "Large", "Extra-Large"],
  crusts: ["Thin", "Thick", "Stuffed", "Gluten-Free", "Regular"],
  toppings: ["Pepperoni", "Sausage", "Ground Beef", "Mushrooms", "Onions", "Peppers", "Olives", "Extra Cheese", "Bacon", "Ham", "Pineapple", "Anchovies", "Jalapeños", "Spinach", "Tomatoes", "Ricotta"],
  sides: ["Garlic Bread", "Wings", "Salad"],
  drinks: ["Coke", "Diet Coke", "Sprite", "Orange Fanta", "Root Beer", "Ginger Ale", "Lemonade", "Iced Tea", "Water"],
  desserts: ["Tiramisu", "Cannoli", "Chocolate Lava Cake", "Cheesecake"],
};

export default function Home() {
  const [state, setState] = useState<State>("idle");
  const [order, setOrder] = useState<OrderWithMeta | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderWithMeta[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleTranscript(transcript: string) {
    if (!transcript?.trim()) return;
    setState("loading");
    setStreamingText("");
    setError("");

    try {
      const res = await fetch("/api/parse-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!res.ok) throw new Error("Failed to parse order");

      setState("streaming");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setStreamingText(fullText);
        }
      }

      const cleaned = fullText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = OrderSchema.parse(JSON.parse(cleaned));

      const newOrder: OrderWithMeta = {
        ...parsed,
        orderNumber: Math.floor(1000 + Math.random() * 9000),
        estimatedMinutes: Math.floor(20 + Math.random() * 20),
      };

      setOrder(newOrder);
      setOrderHistory((prev) => [newOrder, ...prev]);
      setState("success");
    } catch {
      setError("Could not understand the order. Please try again.");
      setState("error");
    }
  }

  function reset() {
    setOrder(null);
    setState("idle");
    setError("");
    setStreamingText("");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-red-950 to-gray-900 flex flex-col items-center justify-center px-4 gap-6 py-12">

      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-4xl">🍕</span>
          <h1 className="text-5xl font-black text-white tracking-tight">
            Slice<span className="text-red-400">AI</span>
          </h1>
        </div>
        <p className="text-gray-400 text-sm tracking-wide uppercase">
          Voice-powered pizza ordering
        </p>
      </div>

      {/* Hint + menu */}
      {state === "idle" && (
        <div className="text-center max-w-sm flex flex-col items-center gap-2">
          <p className="text-gray-500 text-sm">
            Try: <span className="text-gray-300 italic">&ldquo;Large pepperoni thin crust with extra cheese and a garlic bread&rdquo;</span>
          </p>
          <p className="text-gray-600 text-xs">Speak your full order after the beep</p>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
          >
            {menuOpen ? "Hide menu" : "What can I order?"}
          </button>
          {menuOpen && (
            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left text-xs text-gray-400 flex flex-col gap-2">
              {Object.entries(MENU).map(([category, items]) => (
                <div key={category}>
                  <p className="text-gray-300 font-semibold capitalize mb-1">{category}</p>
                  <p className="leading-relaxed">{items.join(" · ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Voice input */}
      {state !== "success" && state !== "streaming" && (
        <VoiceInput onTranscript={handleTranscript} disabled={state === "loading"} />
      )}

      {/* Loading */}
      {state === "loading" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-end gap-1 h-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1.5 bg-red-400 rounded-full animate-bounce"
                style={{ height: `${Math.random() * 24 + 8}px`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <p className="text-gray-400 text-sm">Sending to Claude...</p>
        </div>
      )}

      {/* Streaming */}
      {state === "streaming" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-end gap-1 h-10">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="w-1.5 bg-red-400 rounded-full animate-bounce"
                style={{ height: `${12 + (i % 3) * 10}px`, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
          <p className="text-gray-400 text-sm">Claude is reading your order...</p>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={reset} className="text-gray-400 underline text-xs mt-1">Try again</button>
        </div>
      )}

      {/* Order result */}
      {state === "success" && order && (
        <OrderSummary order={order} onReset={reset} />
      )}

      {/* Order history */}
      {state === "success"
        ? orderHistory.length > 1 && <OrderHistory orders={orderHistory.slice(1)} />
        : orderHistory.length > 0 && <OrderHistory orders={orderHistory} />
      }

      <p className="text-xs text-gray-600">Powered by Claude AI · Demo project</p>
    </main>
  );
}
