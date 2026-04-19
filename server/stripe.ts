/**
 * Stripe integration — checkout sessions, webhook handler, customer management
 * Capability #34: Payments (Stripe)
 */
import Stripe from "stripe";
import type { Express, Request, Response } from "express";
import { getProductById, PRODUCTS } from "./products";

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
    customer_email: opts.userEmail,
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
 * Register Stripe webhook endpoint on Express app
 * MUST be registered BEFORE express.json() middleware
 */
export function registerStripeWebhook(app: Express): void {
  app.post(
    "/api/stripe/webhook",
    // Raw body for signature verification
    (req: Request, res: Response) => {
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        console.error("[Stripe Webhook] Missing signature or webhook secret");
        return res.status(400).json({ error: "Missing signature or webhook secret" });
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return res.status(400).json({ error: "Webhook signature verification failed" });
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      // Process events
      console.log(`[Stripe Webhook] Received: ${event.type} (${event.id})`);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log(`[Stripe] Checkout completed: user=${session.metadata?.user_id}, product=${session.metadata?.product_id}`);
          // Business logic: activate subscription, add credits, etc.
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[Stripe] Invoice paid: ${invoice.id}`);
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
          break;
        }
        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      return res.json({ received: true });
    }
  );
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[Stripe] Checkout completed: user=${session.metadata?.user_id}, product=${session.metadata?.product_id}`);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`[Stripe] Invoice paid: ${invoice.id}`);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
      break;
    }
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
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
