import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const browserRouter = router({
    /** Launch/navigate to a URL */
    navigate: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        url: z.string().url(),
        waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
        browserType: z.enum(["chromium", "firefox", "webkit"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { navigate } = await import("../browserAutomation");
        return navigate(input.sessionId, input.url, { waitUntil: input.waitUntil, browserType: input.browserType });
      }),

    /** Click on an element */
    click: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        selector: z.string().max(10000),
      }))
      .mutation(async ({ input }) => {
        const { click } = await import("../browserAutomation");
        return click(input.sessionId, input.selector);
      }),

    /** Type text into an element */
    type: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        selector: z.string().max(10000),
        text: z.string().max(50000),
        clear: z.boolean().optional(),
        pressEnter: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { type } = await import("../browserAutomation");
        return type(input.sessionId, input.selector, input.text, {
          clear: input.clear,
          pressEnter: input.pressEnter,
        });
      }),

    /** Take a screenshot */
    screenshot: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        fullPage: z.boolean().optional(),
        selector: z.string().max(10000).optional(),
      }))
      .mutation(async ({ input }) => {
        const { screenshot } = await import("../browserAutomation");
        return screenshot(input.sessionId, { fullPage: input.fullPage, selector: input.selector });
      }),

    /** Scroll the page */
    scroll: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        direction: z.enum(["up", "down", "left", "right"]),
        amount: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { scroll } = await import("../browserAutomation");
        return scroll(input.sessionId, input.direction, input.amount);
      }),

    /** Evaluate JavaScript in the page */
    evaluate: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        code: z.string().max(50000),
      }))
      .mutation(async ({ input }) => {
        const { evaluate } = await import("../browserAutomation");
        return evaluate(input.sessionId, input.code);
      }),

    /** Wait for a selector */
    waitForSelector: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        selector: z.string().max(10000),
        state: z.enum(["attached", "detached", "visible", "hidden"]).optional(),
        timeout: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { waitForSelector } = await import("../browserAutomation");
        return waitForSelector(input.sessionId, input.selector, {
          state: input.state,
          timeout: input.timeout,
        });
      }),

    /** Press a keyboard key */
    pressKey: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        key: z.string().max(500),
      }))
      .mutation(async ({ input }) => {
        const { pressKey } = await import("../browserAutomation");
        return pressKey(input.sessionId, input.key);
      }),

    /** Get interactive elements on the page */
    getElements: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500).optional() }))
      .query(async ({ input }) => {
        const { getInteractiveElements } = await import("../browserAutomation");
        return getInteractiveElements(input.sessionId);
      }),

    /** Get console logs from the session */
    consoleLogs: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500) }))
      .query(async ({ input }) => {
        const { getConsoleLogs } = await import("../browserAutomation");
        return getConsoleLogs(input.sessionId);
      }),

    /** Get network requests from the session */
    networkRequests: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500) }))
      .query(async ({ input }) => {
        const { getNetworkRequests } = await import("../browserAutomation");
        return getNetworkRequests(input.sessionId);
      }),

    /** List all active sessions */
    sessions: protectedProcedure.query(async () => {
      const { listSessions } = await import("../browserAutomation");
      return listSessions();
    }),

    /** Close a session */
    close: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500) }))
      .mutation(async ({ input }) => {
        const { closeSession } = await import("../browserAutomation");
        await closeSession(input.sessionId);
        return { success: true };
      }),

    /** Go back in browser history */
    goBack: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500).optional() }))
      .mutation(async ({ input }) => {
        const { goBack } = await import("../browserAutomation");
        return goBack(input.sessionId);
      }),

    /** Go forward in browser history */
    goForward: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500).optional() }))
      .mutation(async ({ input }) => {
        const { goForward } = await import("../browserAutomation");
        return goForward(input.sessionId);
      }),

    /** Reload the current page */
    reload: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500).optional() }))
      .mutation(async ({ input }) => {
        const { reload } = await import("../browserAutomation");
        return reload(input.sessionId);
      }),

    /** Get accessibility tree */
    accessibilityTree: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500).optional() }))
      .query(async ({ input }) => {
        const { getAccessibilityTree } = await import("../browserAutomation");
        return getAccessibilityTree(input.sessionId);
      }),
    /** Set viewport size for responsive testing */
    setViewport: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        width: z.number().min(320).max(3840),
        height: z.number().min(480).max(2160),
        deviceName: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => {
        const { setViewport } = await import("../browserAutomation");
        return setViewport(input.sessionId, input.width, input.height, input.deviceName);
      }),
    /** Run a QA test suite server-side */
    runQA: protectedProcedure
      .input(z.object({
        baseUrl: z.string().url(),
        steps: z.array(z.object({
          action: z.enum(["navigate", "click", "type", "screenshot", "assert", "wait", "scroll", "evaluate", "pressKey", "setViewport"]),
          selector: z.string().max(10000).optional(),
          value: z.string().max(10000).optional(),
          description: z.string().max(50000),
        })),
      }))
      .mutation(async ({ input }) => {
        const { runQATestSuite } = await import("../browserAutomation");
        return runQATestSuite(input.baseUrl, input.steps);
      }),
    /** Get viewport presets */
    viewportPresets: protectedProcedure.query(async () => {
      const { VIEWPORT_PRESETS } = await import("../browserAutomation");
      return VIEWPORT_PRESETS;
    }),
    /** Get performance metrics via CDP */
    performanceMetrics: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500).optional() }))
      .query(async ({ input }) => {
        const { getPerformanceMetrics } = await import("../browserAutomation");
        return getPerformanceMetrics(input.sessionId);
      }),
    /** Run accessibility audit */
    accessibilityAudit: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500).optional() }))
      .mutation(async ({ input }) => {
        const { runAccessibilityAudit } = await import("../browserAutomation");
        return runAccessibilityAudit(input.sessionId);
      }),
    /** Screenshot diff / visual regression */
    screenshotDiff: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        baselineUrl: z.string().url(),
        threshold: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const { screenshotDiff } = await import("../browserAutomation");
        return screenshotDiff(input.sessionId, input.baselineUrl, input.threshold);
      }),
    /** Add network route interception */
    interceptRoute: protectedProcedure
      .input(z.object({
        sessionId: z.string().max(500).optional(),
        urlPattern: z.string().max(2048),
        action: z.enum(["block", "modify", "log"]),
        modifyOptions: z.object({
          status: z.number().optional(),
          body: z.string().max(50000).optional(),
          contentType: z.string().max(1000).optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { interceptRoute } = await import("../browserAutomation");
        return interceptRoute(input.sessionId, input.urlPattern, input.action, input.modifyOptions);
      }),
    /** Clear all network interceptions */
    clearInterceptions: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500).optional() }))
      .mutation(async ({ input }) => {
        const { clearInterceptions } = await import("../browserAutomation");
        return clearInterceptions(input.sessionId);
      }),
    /** Start code coverage collection */
    startCoverage: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500).optional() }))
      .mutation(async ({ input }) => {
        const { startCoverage } = await import("../browserAutomation");
        return startCoverage(input.sessionId);
      }),
    /** Stop code coverage and return results */
    stopCoverage: protectedProcedure
      .input(z.object({ sessionId: z.string().max(500).optional() }))
      .mutation(async ({ input }) => {
        const { stopCoverage } = await import("../browserAutomation");
        return stopCoverage(input.sessionId);
      }),
    /** Get device user-agent presets */
    devicePresets: protectedProcedure.query(async () => {
      const { DEVICE_USER_AGENTS, VIEWPORT_PRESETS } = await import("../browserAutomation");
      return Object.entries(VIEWPORT_PRESETS).map(([name, viewport]) => ({
        name,
        ...(viewport as Record<string, unknown>),
        userAgent: DEVICE_USER_AGENTS[name] || "default",
      }));
    }),
    /** v1.2 Self-Instrumentation Cleanup: close all browser sessions and clean up test artifacts */
    cleanupTestArtifacts: protectedProcedure
      .mutation(async () => {
        const { closeAllSessions } = await import("../browserAutomation");
        await closeAllSessions();
        return { cleaned: true, timestamp: new Date().toISOString() };
      }),
});
