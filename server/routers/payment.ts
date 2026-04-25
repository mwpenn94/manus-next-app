import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const paymentRouter = router({
    products: publicProcedure.query(async () => {
      const { listProducts } = await import("../stripe");
      return listProducts();
    }),
    createCheckout: protectedProcedure
      .input(z.object({
        productId: z.string(),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createCheckoutSession } = await import("../stripe");
        return createCheckoutSession({
          productId: input.productId,
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? "",
          userName: ctx.user.name ?? "",
          origin: input.origin,
        });
      }),
    history: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.stripeCustomerId) return { payments: [] };
      const { getPaymentHistory } = await import("../stripe");
      return getPaymentHistory(ctx.user.stripeCustomerId);
    }),
    subscription: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.stripeSubscriptionId) return null;
      const { getSubscriptionDetails } = await import("../stripe");
      return getSubscriptionDetails(ctx.user.stripeSubscriptionId);
    }),
    /** Create a Stripe Customer Portal session for self-service management */
    createPortalSession: protectedProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const { createPortalSession } = await import("../stripe");
        if (!ctx.user.stripeCustomerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No Stripe customer found. Please make a purchase first." });
        }
        return createPortalSession(ctx.user.stripeCustomerId, input.origin);
      }),
  });
