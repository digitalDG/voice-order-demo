"use client";

import { useState } from "react";
import { OrderWithMeta } from "../../lib/schema";

interface OrderHistoryProps {
  orders: OrderWithMeta[];
}

export default function OrderHistory({ orders }: OrderHistoryProps) {
  const [open, setOpen] = useState(false);

  if (orders.length === 0) return null;

  return (
    <div className="w-full max-w-md">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">🕐</span>
          <span className="text-gray-300 text-sm font-medium">Recent orders</span>
          <span className="bg-red-500/30 text-red-300 text-xs rounded-full px-2 py-0.5">{orders.length}</span>
        </div>
        <span className="text-gray-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <ul className="flex flex-col gap-1.5 mt-2">
          {orders.map((order) => {
            const pizzaCount = order.pizzas?.reduce((sum, p) => sum + p.quantity, 0) ?? 0;
            const otherCount = order.other_items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
            const total = pizzaCount + otherCount;
            return (
              <li key={order.orderNumber} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-red-400 text-xs font-bold">#{order.orderNumber}</span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-500 text-xs">{total} item{total !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-gray-400 text-xs truncate">{order.order_summary}</p>
                </div>
                <span className="text-gray-600 text-xs ml-3 shrink-0">{order.estimatedMinutes}m</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
