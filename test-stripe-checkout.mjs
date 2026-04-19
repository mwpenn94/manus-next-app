import * as jose from 'jose';

// Step 1: Verify env vars
const sk = process.env.STRIPE_SECRET_KEY;
const pk = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
const wh = process.env.STRIPE_WEBHOOK_SECRET;
console.log("=== NS-1: STRIPE CHECKOUT FLOW TEST ===\n");
console.log("--- Step 1: Verify Stripe env vars ---");
console.log("STRIPE_SECRET_KEY:", sk ? `SET (${sk.substring(0,7)}...)` : "MISSING");
console.log("VITE_STRIPE_PUBLISHABLE_KEY:", pk ? `SET (${pk.substring(0,7)}...)` : "MISSING");
console.log("STRIPE_WEBHOOK_SECRET:", wh ? `SET (${wh.substring(0,7)}...)` : "MISSING");

// Step 2: Test products endpoint
console.log("\n--- Step 2: Test products endpoint ---");
const prodRes = await fetch("http://localhost:3000/api/trpc/payment.products");
const prodData = await prodRes.json();
const products = prodData?.result?.data?.json;
if (Array.isArray(products)) {
  console.log(`Products returned: ${products.length}`);
  for (const p of products) {
    console.log(`  - ${p.name} (${p.id}): $${(p.priceAmount / 100).toFixed(2)}`);
  }
} else {
  console.log("Unexpected format:", JSON.stringify(prodData).substring(0, 200));
}

// Step 3: Generate JWT and test checkout
console.log("\n--- Step 3: Test checkout session creation ---");
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const jwt = await new jose.SignJWT({ userId: 1, openId: "test-user", name: "Test User" })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(secret);
console.log(`JWT generated: ${jwt.substring(0, 20)}...`);

const checkoutRes = await fetch("http://localhost:3000/api/trpc/payment.createCheckout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Cookie": `manus_session=${jwt}`,
  },
  body: JSON.stringify({
    json: {
      productId: "pro_monthly",
      origin: "https://manusnext-mlromfub.manus.space",
    },
  }),
});
const checkoutData = await checkoutRes.json();
const result = checkoutData?.result?.data?.json;
if (result && result.url) {
  console.log(`Checkout URL: ${result.url.substring(0, 80)}...`);
  console.log("SUCCESS: Stripe checkout session created!");
} else {
  const err = checkoutData?.error?.json || checkoutData;
  console.log("Error:", JSON.stringify(err).substring(0, 300));
}

// Step 4: Test webhook
console.log("\n--- Step 4: Test webhook endpoint ---");
const webhookRes = await fetch("http://localhost:3000/api/stripe/webhook", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "stripe-signature": "test",
  },
  body: JSON.stringify({ id: "evt_test_123", type: "test", data: { object: {} } }),
});
const webhookData = await webhookRes.json();
console.log("Webhook response:", JSON.stringify(webhookData));
if (webhookData.error && webhookData.error.includes("signature")) {
  console.log("EXPECTED: Signature verification works (real signatures required)");
}

console.log("\n=== STRIPE CHECKOUT FLOW TEST COMPLETE ===");
