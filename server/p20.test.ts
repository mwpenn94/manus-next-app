/**
 * P20 Tests — Stripe Checkout + Keyboard Shortcuts Panel
 *
 * Covers: payment history endpoint, subscription details endpoint,
 * BillingPage UI enhancements, keyboard shortcuts ? key trigger,
 * products.ts configuration, and stripe.ts functions.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..");

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), "utf-8");
}

describe("P20 — Stripe Checkout Integration", () => {
  describe("Products Configuration", () => {
    const products = readFile("server/products.ts");

    it("defines ProductConfig interface with required fields", () => {
      expect(products).toContain("interface ProductConfig");
      expect(products).toContain("priceAmount: number");
      expect(products).toContain('mode: "payment" | "subscription"');
    });

    it("includes Pro Monthly subscription at $39/month", () => {
      expect(products).toContain("pro_monthly");
      expect(products).toContain("3900");
      expect(products).toMatch(/interval.*month/);
    });

    it("includes Pro Yearly subscription with savings", () => {
      expect(products).toContain("pro_yearly");
      expect(products).toContain("37400");
    });

    it("includes Team Monthly subscription", () => {
      expect(products).toContain("team_monthly");
      expect(products).toContain("9900");
    });

    it("includes one-time credits purchase", () => {
      expect(products).toContain("credits_100");
      expect(products).toContain('mode: "payment"');
    });

    it("exports getProductById helper", () => {
      expect(products).toContain("export function getProductById");
    });
  });

  describe("Stripe Module", () => {
    const stripe = readFile("server/stripe.ts");

    it("creates checkout sessions with metadata and promotion codes", () => {
      expect(stripe).toContain("createCheckoutSession");
      expect(stripe).toContain("client_reference_id");
      expect(stripe).toContain("allow_promotion_codes: true");
      expect(stripe).toContain("metadata");
      expect(stripe).toContain("customer_email");
    });

    it("handles webhook with signature verification", () => {
      expect(stripe).toContain("handleStripeWebhook");
      expect(stripe).toContain("stripe-signature");
      expect(stripe).toContain("constructEvent");
    });

    it("detects test events and returns verification response", () => {
      expect(stripe).toContain('event.id.startsWith("evt_test_")');
      expect(stripe).toContain("verified: true");
    });

    it("handles checkout.session.completed event", () => {
      expect(stripe).toContain("checkout.session.completed");
      expect(stripe).toContain("stripeCustomerId");
    });

    it("handles subscription lifecycle events", () => {
      expect(stripe).toContain("customer.subscription.deleted");
      expect(stripe).toContain("customer.subscription.updated");
    });

    it("exports getPaymentHistory function", () => {
      expect(stripe).toContain("export async function getPaymentHistory");
      expect(stripe).toContain("charges.list");
    });

    it("exports getSubscriptionDetails function", () => {
      expect(stripe).toContain("export async function getSubscriptionDetails");
      expect(stripe).toContain("subscriptions.retrieve");
    });

    it("payment history returns structured payment data", () => {
      expect(stripe).toContain("receiptUrl");
      expect(stripe).toContain("c.receipt_url");
      expect(stripe).toContain("c.amount");
      expect(stripe).toContain("c.status");
    });

    it("subscription details returns plan info", () => {
      expect(stripe).toContain("currentPeriodEnd");
      expect(stripe).toContain("cancelAtPeriodEnd");
      expect(stripe).toContain("unit_amount");
    });
  });

  describe("Payment Router", () => {
    const routers = readFile("server/routers.ts");

    it("has payment.products public procedure", () => {
      expect(routers).toMatch(/payment.*router/);
      expect(routers).toContain("listProducts");
    });

    it("has payment.createCheckout protected procedure", () => {
      expect(routers).toContain("createCheckout");
      expect(routers).toContain("createCheckoutSession");
    });

    it("has payment.history protected procedure", () => {
      expect(routers).toContain("history: protectedProcedure");
      expect(routers).toContain("getPaymentHistory");
    });

    it("has payment.subscription protected procedure", () => {
      expect(routers).toContain("subscription: protectedProcedure");
      expect(routers).toContain("getSubscriptionDetails");
    });

    it("handles users without Stripe customer ID gracefully", () => {
      expect(routers).toContain("!ctx.user.stripeCustomerId");
      expect(routers).toContain("payments: []");
    });
  });
});

describe("P20 — BillingPage UI", () => {
  const billing = readFile("client/src/pages/BillingPage.tsx");

  it("queries payment history from tRPC", () => {
    expect(billing).toContain("trpc.payment.history.useQuery");
  });

  it("queries subscription details from tRPC", () => {
    expect(billing).toContain("trpc.payment.subscription.useQuery");
  });

  it("shows subscription status banner with Crown icon", () => {
    expect(billing).toContain("Crown");
    expect(billing).toContain("Active Subscription");
  });

  it("displays subscription renewal date", () => {
    expect(billing).toContain("currentPeriodEnd");
    expect(billing).toContain("Renews");
  });

  it("shows cancel at period end indicator", () => {
    expect(billing).toContain("cancelAtPeriodEnd");
    expect(billing).toContain("Cancels at period end");
  });

  it("renders payment history section with Receipt icon", () => {
    expect(billing).toContain("Receipt");
    expect(billing).toContain("Payment History");
  });

  it("shows payment amount and currency", () => {
    expect(billing).toContain("payment.amount / 100");
    expect(billing).toContain("payment.currency.toUpperCase()");
  });

  it("provides receipt URL links", () => {
    expect(billing).toContain("payment.receiptUrl");
    expect(billing).toContain("View receipt");
  });

  it("shows empty state for no payments", () => {
    expect(billing).toContain("No payments yet");
    expect(billing).toContain("Purchases and subscriptions will appear here");
  });

  it("opens checkout in new tab", () => {
    expect(billing).toContain('window.open(data.url, "_blank")');
  });

  it("shows test card hint", () => {
    expect(billing).toContain("4242 4242 4242 4242");
  });
});

describe("P20 — Keyboard Shortcuts Enhancement", () => {
  describe("useKeyboardShortcuts hook", () => {
    const hook = readFile("client/src/hooks/useKeyboardShortcuts.ts");

    it("includes ? key shortcut in SHORTCUTS list", () => {
      expect(hook).toContain('key: "?"');
      expect(hook).toContain('label: "Help"');
    });

    it("handles ? key press when not in input", () => {
      expect(hook).toContain('e.key === "?"');
      expect(hook).toContain("!isInput");
    });

    it("does not trigger ? shortcut with modifier keys", () => {
      expect(hook).toContain("!isMod");
    });

    it("still supports ⌘/ shortcut", () => {
      expect(hook).toContain('e.key === "/"');
    });

    it("has 8 shortcuts defined", () => {
      const matches = hook.match(/\{ key:/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe("KeyboardShortcutsDialog", () => {
    const dialog = readFile("client/src/components/KeyboardShortcutsDialog.tsx");

    it("mentions both ? and ⌘/ in footer", () => {
      expect(dialog).toContain("?");
      expect(dialog).toContain("⌘/");
    });

    it("groups shortcuts by category", () => {
      expect(dialog).toContain("navigation");
      expect(dialog).toContain("task");
      expect(dialog).toContain("editing");
      expect(dialog).toContain("general");
    });

    it("uses accessible text colors (no opacity modifiers)", () => {
      expect(dialog).not.toMatch(/text-foreground\/\d+/);
    });
  });
});
