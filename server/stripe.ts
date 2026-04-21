/**
 * Stripe integration — checkout sessions, webhook handler, customer management
 * Capability #34: Payments (Stripe)
 */
import Stripe from "stripe";
import type { Request, Response } from "express";
import { getProductById, PRODUCTS } from "./products";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    stripeInstance = new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
  }
  return stripeInstance;
}

/**
 * Create a Stripe Checkout Session
 */
export async function createCheckoutSession(opts: {
  productId: string;
  userId: number;
  userEmail: string;
  userName: string;
  origin: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const product = getProductById(opts.productId);
  if (!product) throw new Error(`Unknown product: ${opts.productId}`);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: product.mode,
    ...(opts.userEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opts.userEmail) ? { customer_email: opts.userEmail } : {}),
    client_reference_id: opts.userId.toString(),
    allow_promotion_codes: true,
    metadata: {
      user_id: opts.userId.toString(),
      customer_email: opts.userEmail,
      customer_name: opts.userName,
      product_id: opts.productId,
    },
    line_items: [
      {
        price_data: {
          currency: product.currency,
          unit_amount: product.priceAmount,
          product_data: {
            name: product.name,
            description: product.description,
          },
          ...(product.mode === "subscription" && product.interval
            ? { recurring: { interval: product.interval } }
            : {}),
        },
        quantity: 1,
      },
    ],
    success_url: `${opts.origin}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${opts.origin}/billing?status=cancelled`,
  };

  const session = await stripe.checkout.sessions.create(sessionParams);
  if (!session.url) throw new Error("No checkout URL returned");
  return { url: session.url };
}

/**
 * Handle Stripe webhook (called from index.ts)
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("[Stripe Webhook] Missing signature or webhook secret");
    res.status(400).json({ error: "Missing signature or webhook secret" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    res.json({ verified: true });
    return;
  }

  console.log(`[Stripe Webhook] Received: ${event.type} (${event.id})`);

  await fulfillStripeEvent(event);

  res.json({ received: true });
}

/**
 * Core fulfillment logic — persists Stripe IDs to the users table
 */
async function fulfillStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.toString();
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.toString();

      if (userId && customerId) {
        const db = await getDb();
        if (!db) break;
        await db.update(users).set({
          stripeCustomerId: customerId,
          ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
        }).where(eq(users.id, userId));
        console.log(`[Stripe] Persisted customer=${customerId} sub=${subscriptionId ?? "none"} for user=${userId}`);
      } else {
        console.warn(`[Stripe] checkout.session.completed missing userId or customerId`, session.metadata);
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      if (customerId) {
        console.log(`[Stripe] Invoice paid: ${invoice.id} for customer=${customerId}`);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      if (customerId) {
        const db = await getDb();
        if (!db) break;
        await db.update(users).set({ stripeSubscriptionId: null }).where(eq(users.stripeCustomerId, customerId));
        console.log(`[Stripe] Subscription cancelled for customer=${customerId}`);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      if (customerId) {
        const db2 = await getDb();
        if (!db2) break;
        await db2.update(users).set({ stripeSubscriptionId: sub.id }).where(eq(users.stripeCustomerId, customerId));
        console.log(`[Stripe] Subscription updated: ${sub.id} for customer=${customerId}`);
      }
      break;
    }
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}

/**
 * List available products for the frontend
 */
export function listProducts() {
  return PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.priceAmount / 100,
    currency: p.currency,
    mode: p.mode,
    interval: p.interval,
  }));
}

/**
 * Get payment history for a user by their Stripe customer ID
 * Fetches directly from Stripe API — no local duplication
 */
export async function getPaymentHistory(stripeCustomerId: string): Promise<{
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    description: string | null;
    created: number;
    receiptUrl: string | null;
  }>;
}> {
  const stripe = getStripe();
  const charges = await stripe.charges.list({
    customer: stripeCustomerId,
    limit: 20,
  });

  return {
    payments: charges.data.map((c) => ({
      id: c.id,
      amount: c.amount,
      currency: c.currency,
      status: c.status,
      description: c.description,
      created: c.created,
      receiptUrl: c.receipt_url,
    })),
  };
}

/**
 * Get subscription details for a user
 */
export async function getSubscriptionDetails(subscriptionId: string): Promise<{
  id: string;
  status: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  plan: { amount: number; currency: string; interval: string };
} | null> {
  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
    const item = sub.items?.data?.[0];
    return {
      id: sub.id,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end ?? Math.floor(Date.now() / 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      plan: {
        amount: item?.price?.unit_amount ?? 0,
        currency: item?.price?.currency ?? "usd",
        interval: (item?.price?.recurring?.interval as string) ?? "month",
      },
    };
  } catch {
    return null;
  }
}
