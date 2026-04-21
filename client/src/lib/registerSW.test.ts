/**
 * Vitest tests for registerSW utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the module logic by mocking navigator.serviceWorker
describe("registerSW", () => {
  let originalSW: ServiceWorkerContainer;

  beforeEach(() => {
    originalSW = navigator.serviceWorker;
    vi.stubGlobal("window", {
      ...window,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      location: { reload: vi.fn() },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not throw when serviceWorker is not available", async () => {
    // Simulate no SW support
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { registerServiceWorker } = await import("./registerSW");
    expect(() => registerServiceWorker()).not.toThrow();

    // Restore
    Object.defineProperty(navigator, "serviceWorker", {
      value: originalSW,
      configurable: true,
      writable: true,
    });
  });

  it("skipWaitingAndReload should call postMessage on waiting worker", async () => {
    const mockWaiting = { postMessage: vi.fn() };
    const mockGetRegistration = vi.fn().mockResolvedValue({ waiting: mockWaiting });

    Object.defineProperty(navigator, "serviceWorker", {
      value: { getRegistration: mockGetRegistration },
      configurable: true,
      writable: true,
    });

    const { skipWaitingAndReload } = await import("./registerSW");
    skipWaitingAndReload();

    // Wait for the promise to resolve
    await new Promise((r) => setTimeout(r, 50));
    expect(mockGetRegistration).toHaveBeenCalled();
    expect(mockWaiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });

    // Restore
    Object.defineProperty(navigator, "serviceWorker", {
      value: originalSW,
      configurable: true,
      writable: true,
    });
  });
});
