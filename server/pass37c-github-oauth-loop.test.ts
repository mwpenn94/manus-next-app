/**
 * Pass 37c: GitHub OAuth Loop Fix Tests
 * 
 * Validates that GitHubPage handles both server-side success redirect
 * (?oauth_success=github) AND client-side fallback (?code=X&state=Y),
 * and that the popup message handler covers both message types.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const GITHUB_PAGE_PATH = resolve(__dirname, "../client/src/pages/GitHubPage.tsx");
const INDEX_TS_PATH = resolve(__dirname, "./_core/index.ts");

const githubPageSrc = readFileSync(GITHUB_PAGE_PATH, "utf-8");
const indexTsSrc = readFileSync(INDEX_TS_PATH, "utf-8");

describe("Pass 37c: GitHub OAuth loop fix", () => {
  describe("GitHubPage OAuth handling", () => {
    it("imports and uses completeOAuth mutation", () => {
      expect(githubPageSrc).toContain("trpc.connector.completeOAuth.useMutation");
    });

    it("handles ?oauth_success=github redirect (server-side success)", () => {
      expect(githubPageSrc).toContain('params.get("oauth_success") === "github"');
    });

    it("handles ?code=X&state=Y fallback redirect (server-side failure)", () => {
      expect(githubPageSrc).toContain('params.get("code")');
      expect(githubPageSrc).toContain('params.get("state")');
      // Must parse state and call completeOAuth
      expect(githubPageSrc).toContain("JSON.parse(atob(");
      expect(githubPageSrc).toContain('parsed.connectorId === "github"');
      expect(githubPageSrc).toContain("completeOAuthMut.mutate");
    });

    it("cleans up URL after handling code/state params", () => {
      // After processing code+state, should clean the URL
      const codeHandlerSection = githubPageSrc.substring(
        githubPageSrc.indexOf('params.get("code")'),
        githubPageSrc.indexOf("// ── Listen for popup")
      );
      expect(codeHandlerSection).toContain('window.history.replaceState({}, "", "/github")');
    });

    it("listens for connector-oauth-success popup messages", () => {
      expect(githubPageSrc).toContain('"connector-oauth-success"');
    });

    it("listens for connector-oauth-callback popup messages (fallback)", () => {
      expect(githubPageSrc).toContain('"connector-oauth-callback"');
      // Must extract code from message and call completeOAuth
      expect(githubPageSrc).toContain("e.data?.code");
    });

    it("handles base64url state encoding (- and _ chars)", () => {
      // base64url uses - and _ instead of + and /
      // The fix should handle this conversion
      expect(githubPageSrc).toContain("replace(/-/g");
      expect(githubPageSrc).toContain("replace(/_/g");
    });

    it("sets connecting state during code exchange", () => {
      // When code+state fallback is triggered, should show loading state
      const codeSection = githubPageSrc.substring(
        githubPageSrc.indexOf('params.get("code")'),
        githubPageSrc.indexOf("// ── Listen for popup")
      );
      expect(codeSection).toContain("setConnecting(true)");
    });

    it("completeOAuth mutation has error handler", () => {
      expect(githubPageSrc).toContain("onError:");
      // Should show toast on error
      const mutationSection = githubPageSrc.substring(
        githubPageSrc.indexOf("completeOAuth.useMutation"),
        githubPageSrc.indexOf("// ── Handle OAuth redirects")
      );
      expect(mutationSection).toContain("toast.error");
    });
  });

  describe("Server-side callback error logging", () => {
    it("logs connector ID and user ID on token exchange failure", () => {
      expect(indexTsSrc).toContain("Token exchange failed for ${state.connectorId}");
      expect(indexTsSrc).toContain("user ${state.userId}");
    });

    it("logs origin and returnPath on fallback", () => {
      expect(indexTsSrc).toContain("Falling back to client-side exchange");
      expect(indexTsSrc).toContain("state.origin");
      expect(indexTsSrc).toContain("state.returnPath");
    });
  });

  describe("Router has completeOAuth procedure", () => {
    it("connector router exports completeOAuth", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("connector.completeOAuth");
    });
  });
});
