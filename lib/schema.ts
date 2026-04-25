import { z } from "zod";

export const PizzaSchema = z.object({
  size: z.enum(["personal", "small", "medium", "large", "extra-large"]).nullish(),
  crust: z.enum(["thin", "thick", "stuffed", "gluten-free", "regular"]).nullish(),
  toppings: z.array(z.string()).nullish(),
  quantity: z.number(),
  special_requests: z.string().nullish(),
});

export const OrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  size: z.enum(["small", "medium", "large"]).nullish(),
  special_requests: z.string().nullish(),
});

export const OrderSchema = z.object({
  pizzas: z.array(PizzaSchema).nullish(),
  other_items: z.array(OrderItemSchema).nullish(),
  special_instructions: z.string().nullish(),
  uncertain_items: z.array(z.string()).nullish(),
  order_summary: z.string(),
});

export type ParsedOrder = z.infer<typeof OrderSchema>;

export type OrderWithMeta = ParsedOrder & {
  orderNumber: number;
  estimatedMinutes: number;
};
