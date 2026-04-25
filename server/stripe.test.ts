import { readRouterSource } from "./test-utils/readRouterSource";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Stripe SDK
const mockCheckoutSessionCreate = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: mockCheckoutSessionCreate,
        },
      },
      webhooks: {
        constructEvent: mockWebhooksConstructEvent,
      },
    })),
  };
});

// Mock DB
vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  })),
}));

// Mock schema
vi.mock("../drizzle/schema", () => ({
  users: { id: "id", stripeCustomerId: "stripeCustomerId", stripeSubscriptionId: "stripeSubscriptionId" },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}));

describe("Stripe Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set env vars for tests
    process.env.STRIPE_SECRET_KEY = "sk_test_mock123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock123";
  });

  describe("Products", () => {
    it("lists all available products", async () => {
      const { listProducts } = await import("./stripe");
      const products = listProducts();
      expect(products).toHaveLength(4);
      expect(products[0]).toHaveProperty("id", "pro_monthly");
      expect(products[0]).toHaveProperty("price", 39);
      expect(products[0]).toHaveProperty("currency", "usd");
      expect(products[0]).toHaveProperty("mode", "subscription");
      expect(products[0]).toHaveProperty("interval", "month");
    });

    it("includes one-time payment products", async () => {
      const { listProducts } = await import("./stripe");
      const products = listProducts();
      const credits = products.find((p: any) => p.id === "credits_100");
      expect(credits).toBeDefined();
      expect(credits!.mode).toBe("payment");
      expect(credits!.price).toBe(10);
    });

    it("product catalog has correct pricing", async () => {
      const { PRODUCTS } = await import("./products");
      expect(PRODUCTS).toHaveLength(4);
      // Pro monthly: $39
      expect(PRODUCTS[0].priceAmount).toBe(3900);
      // Pro yearly: $374 (save 20%)
      expect(PRODUCTS[1].priceAmount).toBe(37400);
      // Team monthly: $99
      expect(PRODUCTS[2].priceAmount).toBe(9900);
      // Credits: $10
      expect(PRODUCTS[3].priceAmount).toBe(1000);
    });

    it("getProductById returns correct product", async () => {
      const { getProductById } = await import("./products");
      const pro = getProductById("pro_monthly");
      expect(pro).toBeDefined();
      expect(pro!.name).toContain("Pro");
      expect(pro!.mode).toBe("subscription");

      const unknown = getProductById("nonexistent");
      expect(unknown).toBeUndefined();
    });
  });

  describe("Checkout Session", () => {
    it("creates checkout session with correct params", async () => {
      mockCheckoutSessionCreate.mockResolvedValueOnce({
        url: "https://checkout.stripe.com/test_session",
        id: "cs_test_123",
      });

      const { createCheckoutSession } = await import("./stripe");
      const result = await createCheckoutSession({
        productId: "pro_monthly",
        userId: 1,
        userEmail: "test@example.com",
        userName: "Test User",
        origin: "https://manusnext.example.com",
      });

      expect(result.url).toBe("https://checkout.stripe.com/test_session");
      expect(mockCheckoutSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          customer_email: "test@example.com",
          client_reference_id: "1",
          allow_promotion_codes: true,
          metadata: expect.objectContaining({
            user_id: "1",
            customer_email: "test@example.com",
            customer_name: "Test User",
            product_id: "pro_monthly",
          }),
          success_url: expect.stringContaining("manusnext.example.com/billing"),
          cancel_url: expect.stringContaining("manusnext.example.com/billing"),
        })
      );
    });

    it("rejects unknown product IDs", async () => {
      const { createCheckoutSession } = await import("./stripe");
      await expect(
        createCheckoutSession({
          productId: "nonexistent_product",
          userId: 1,
          userEmail: "test@example.com",
          userName: "Test",
          origin: "https://example.com",
        })
      ).rejects.toThrow("Unknown product");
    });

    it("throws when no checkout URL returned", async () => {
      mockCheckoutSessionCreate.mockResolvedValueOnce({ url: null, id: "cs_test_no_url" });

      const { createCheckoutSession } = await import("./stripe");
      await expect(
        createCheckoutSession({
          productId: "credits_100",
          userId: 1,
          userEmail: "test@example.com",
          userName: "Test",
          origin: "https://example.com",
        })
      ).rejects.toThrow("No checkout URL");
    });
  });

  describe("Webhook", () => {
    it("test events return verified: true via handleStripeWebhook", async () => {
      // Mock constructEvent to return a test event
      mockWebhooksConstructEvent.mockReturnValueOnce({
        id: "evt_test_webhook_12345",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_test_123" } },
      });

      const { handleStripeWebhook } = await import("./stripe");

      const mockReq = {
        headers: { "stripe-signature": "t=123,v1=sig" },
        body: Buffer.from(JSON.stringify({ id: "evt_test_webhook_12345" })),
      } as any;

      let statusCode = 200;
      let responseBody: any = null;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (body: any) => {
          responseBody = body;
          return mockRes;
        },
      } as any;

      await handleStripeWebhook(mockReq, mockRes);

      expect(statusCode).toBe(200);
      expect(responseBody).toEqual({ verified: true });
    });

    it("real events return received: true via handleStripeWebhook", async () => {
      // Mock constructEvent to return a real event
      mockWebhooksConstructEvent.mockReturnValueOnce({
        id: "evt_1NB8a2345678",
        type: "invoice.paid",
        data: { object: { id: "in_test_123", customer: "cus_test_123" } },
      });

      const { handleStripeWebhook } = await import("./stripe");

      const mockReq = {
        headers: { "stripe-signature": "t=123,v1=realsig" },
        body: Buffer.from(JSON.stringify({ id: "evt_1NB8a2345678" })),
      } as any;

      let statusCode = 200;
      let responseBody: any = null;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (body: any) => {
          responseBody = body;
          return mockRes;
        },
      } as any;

      await handleStripeWebhook(mockReq, mockRes);

      expect(statusCode).toBe(200);
      expect(responseBody).toEqual({ received: true });
    });

    it("returns 400 when signature verification fails", async () => {
      mockWebhooksConstructEvent.mockImplementationOnce(() => {
        throw new Error("Invalid signature");
      });

      const { handleStripeWebhook } = await import("./stripe");

      const mockReq = {
        headers: { "stripe-signature": "t=123,v1=badsig" },
        body: Buffer.from("invalid"),
      } as any;

      let statusCode = 200;
      let responseBody: any = null;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (body: any) => {
          responseBody = body;
          return mockRes;
        },
      } as any;

      await handleStripeWebhook(mockReq, mockRes);

      expect(statusCode).toBe(400);
      expect(responseBody).toEqual({ error: "Webhook signature verification failed" });
    });

    it("returns 400 when signature header is missing", async () => {
      const { handleStripeWebhook } = await import("./stripe");

      const mockReq = {
        headers: {},
        body: Buffer.from("{}"),
      } as any;

      let statusCode = 200;
      let responseBody: any = null;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (body: any) => {
          responseBody = body;
          return mockRes;
        },
      } as any;

      await handleStripeWebhook(mockReq, mockRes);

      expect(statusCode).toBe(400);
      expect(responseBody).toEqual({ error: "Missing signature or webhook secret" });
    });

    it("non-test event IDs do not start with evt_test_", () => {
      const eventId = "evt_1234567890";
      expect(eventId.startsWith("evt_test_")).toBe(false);
    });

    it("webhook route is registered before express.json()", async () => {
      const fs = await import("fs");
      const indexContent = fs.readFileSync("server/_core/index.ts", "utf-8");
      
      // Find positions of webhook route and express.json (may have limit param)
      const webhookPos = indexContent.indexOf("/api/stripe/webhook");
      const jsonMiddlewarePos = indexContent.indexOf("express.json(");
      
      // Webhook should be registered BEFORE json middleware
      expect(webhookPos).toBeGreaterThan(-1);
      expect(jsonMiddlewarePos).toBeGreaterThan(-1);
      expect(webhookPos).toBeLessThan(jsonMiddlewarePos);
    });

    it("webhook uses express.raw for body parsing", async () => {
      const fs = await import("fs");
      const indexContent = fs.readFileSync("server/_core/index.ts", "utf-8");
      
      // Should use express.raw for the webhook route
      expect(indexContent).toContain('express.raw({ type: "application/json" })');
    });
  });

  describe("ENV Configuration", () => {
    it("env.ts declares Stripe environment variables", async () => {
      const fs = await import("fs");
      const envContent = fs.readFileSync("server/_core/env.ts", "utf-8");
      
      expect(envContent).toContain("STRIPE_SECRET_KEY");
      expect(envContent).toContain("STRIPE_WEBHOOK_SECRET");
      expect(envContent).toContain("VITE_STRIPE_PUBLISHABLE_KEY");
    });

    it("stripe.ts reads STRIPE_SECRET_KEY from process.env", async () => {
      const fs = await import("fs");
      const stripeContent = fs.readFileSync("server/stripe.ts", "utf-8");
      
      expect(stripeContent).toContain("process.env.STRIPE_SECRET_KEY");
      expect(stripeContent).toContain("process.env.STRIPE_WEBHOOK_SECRET");
    });
  });

  describe("Payment Router", () => {
    it("payment router exists in routers.ts", async () => {
      const fs = await import("fs");
      const routersContent = readRouterSource();
      
      expect(routersContent).toContain("paymentRouter = router(");
      expect(routersContent).toContain("products: publicProcedure");
      expect(routersContent).toContain("createCheckout: protectedProcedure");
    });

    it("checkout requires authentication", async () => {
      const fs = await import("fs");
      const routersContent = readRouterSource();
      
      // createCheckout should use protectedProcedure
      expect(routersContent).toContain("createCheckout: protectedProcedure");
    });
  });

  describe("Frontend Integration", () => {
    it("BillingPage uses trpc.payment.products", async () => {
      const fs = await import("fs");
      const billingContent = fs.readFileSync("client/src/pages/BillingPage.tsx", "utf-8");
      
      expect(billingContent).toContain("trpc.payment.products");
      expect(billingContent).toContain("trpc.payment.createCheckout");
    });

    it("checkout opens in new tab", async () => {
      const fs = await import("fs");
      const billingContent = fs.readFileSync("client/src/pages/BillingPage.tsx", "utf-8");
      
      expect(billingContent).toContain("window.open");
      expect(billingContent).toContain("_blank");
    });
  });

  describe("Database Schema", () => {
    it("users table has Stripe columns", async () => {
      const fs = await import("fs");
      const schemaContent = fs.readFileSync("drizzle/schema.ts", "utf-8");
      
      expect(schemaContent).toContain("stripeCustomerId");
      expect(schemaContent).toContain("stripeSubscriptionId");
    });
  });
});
