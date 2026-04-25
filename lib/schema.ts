import { z } from "zod";

export const PizzaSchema = z.object({
  size: z.enum(["personal", "small", "medium", "large", "extra-large"]).optional(),
  crust: z.enum(["thin", "thick", "stuffed", "gluten-free", "regular"]).optional(),
  toppings: z.array(z.string()).optional(),
  quantity: z.number(),
  special_requests: z.string().optional(),
});

export const OrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  size: z.enum(["small", "medium", "large"]).optional(),
  special_requests: z.string().optional(),
});

export const OrderSchema = z.object({
  pizzas: z.array(PizzaSchema).optional(),
  other_items: z.array(OrderItemSchema).optional(),
  special_instructions: z.string().optional(),
  uncertain_items: z.array(z.string()).optional(),
  order_summary: z.string(),
});

export type ParsedOrder = z.infer<typeof OrderSchema>;

export type OrderWithMeta = ParsedOrder & {
  orderNumber: number;
  estimatedMinutes: number;
};
