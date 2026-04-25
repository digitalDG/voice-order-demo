"use client";

import { OrderWithMeta } from "../../lib/schema";

interface OrderSummaryProps {
  order: OrderWithMeta;
  onReset: () => void;
}

function getIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("bread") || n.includes("garlic")) return "🥖";
  if (n.includes("wing")) return "🍗";
  if (n.includes("salad")) return "🥗";
  if (n.includes("tiramisu")) return "🍮";
  if (n.includes("cannoli")) return "🥐";
  if (n.includes("lava") || n.includes("cake") || n.includes("cheesecake")) return "🍰";
  if (n.includes("lemonade")) return "🍋";
  if (n.includes("iced tea") || n.includes("tea")) return "🧋";
  if (n.includes("water")) return "💧";
  if (n.includes("coke") || n.includes("sprite") || n.includes("fanta") || n.includes("ginger") || n.includes("root beer") || n.includes("soda")) return "🥤";
  return "🍽️";
}

export default function OrderSummary({ order, onReset }: OrderSummaryProps) {
  const hasPizzas = order.pizzas && order.pizzas.length > 0;
  const hasOtherItems = order.other_items && order.other_items.length > 0;
  const hasUncertain = order.uncertain_items && order.uncertain_items.length > 0;
  const hasItems = hasPizzas || hasOtherItems;

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Order header */}
      <div className={`px-6 py-4 flex items-center justify-between ${hasItems ? "bg-red-500" : "bg-gray-400"}`}>
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wide">
            {hasItems ? "Order Confirmed" : "Nothing Ordered"}
          </p>
          <p className="text-white font-black text-xl">#{order.orderNumber}</p>
        </div>
        {hasItems && (
          <div className="text-right">
            <p className="text-white/70 text-xs uppercase tracking-wide">Est. Ready</p>
            <p className="text-white font-bold">{order.estimatedMinutes}–{order.estimatedMinutes + 5} min</p>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col gap-4">
        {/* Uncertain items warning */}
        {hasUncertain && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-1">Needs clarification</p>
              <ul className="text-xs text-amber-600 space-y-0.5">
                {order.uncertain_items!.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Pizzas */}
        {hasPizzas && (
          <ul className="divide-y divide-gray-100">
            {order.pizzas!.map((pizza, i) => (
              <li key={i} className="py-3">
                <div className="flex items-start gap-2">
                  <span className="text-xl">🍕</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {pizza.quantity}× {pizza.size ? pizza.size.charAt(0).toUpperCase() + pizza.size.slice(1) : "Medium"} Pizza
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pizza.crust && pizza.crust !== "regular" && (
                        <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
                          {pizza.crust} crust
                        </span>
                      )}
                      {pizza.toppings?.map((t, j) => (
                        <span key={j} className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                    {pizza.special_requests && (
                      <p className="text-xs text-gray-400 mt-1">{pizza.special_requests}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Other items */}
        {hasOtherItems && (
          <ul className="divide-y divide-gray-100">
            {order.other_items!.map((item, i) => (
              <li key={i} className="py-2 flex items-center gap-2">
                <span className="text-lg">{getIcon(item.name)}</span>
                <div>
                  <p className="text-sm text-gray-700">
                    {item.quantity}× {item.name}
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    {item.size && (
                      <span className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">{item.size}</span>
                    )}
                    {item.special_requests && (
                      <span className="text-xs text-gray-400">({item.special_requests})</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Special instructions */}
        {order.special_instructions && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-yellow-800">
            <span className="font-medium">Note: </span>
            {order.special_instructions}
          </div>
        )}

        <p className="text-sm text-gray-400 italic">{order.order_summary}</p>

        <button
          onClick={onReset}
          className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
        >
          Start New Order
        </button>
      </div>
    </div>
  );
}
