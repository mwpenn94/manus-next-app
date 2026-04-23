/**
 * Stripe product/price definitions
 * Centralized configuration for all purchasable items
 */

export interface ProductConfig {
  id: string;
  name: string;
  description: string;
  priceAmount: number; // in cents
  currency: string;
  mode: "payment" | "subscription";
  interval?: "month" | "year";
}

export const PRODUCTS: ProductConfig[] = [
  {
    id: "pro_monthly",
    name: "Manus Pro (Monthly)",
    description: "Full access to all agent capabilities, unlimited tasks, priority execution",
    priceAmount: 3900, // $39/month
    currency: "usd",
    mode: "subscription",
    interval: "month",
  },
  {
    id: "pro_yearly",
    name: "Manus Pro (Yearly)",
    description: "Full access to all agent capabilities, unlimited tasks, priority execution — save 20%",
    priceAmount: 37400, // $374/year ($31.17/mo)
    currency: "usd",
    mode: "subscription",
    interval: "year",
  },
  {
    id: "team_monthly",
    name: "Manus Team (Monthly)",
    description: "Team collaboration, shared sessions, admin controls, 10 seats included",
    priceAmount: 9900, // $99/month
    currency: "usd",
    mode: "subscription",
    interval: "month",
  },
  {
    id: "credits_100",
    name: "100 Agent Credits",
    description: "One-time purchase of 100 agent execution credits",
    priceAmount: 1000, // $10
    currency: "usd",
    mode: "payment",
  },
];

export function getProductById(id: string): ProductConfig | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
