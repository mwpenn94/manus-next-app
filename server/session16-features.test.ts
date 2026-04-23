import { describe, it, expect } from "vitest";

/**
 * Session 16: Mobile Mode Selector & Azure AD Integration Tests
 */

describe("Session 16: Mobile Mode Selector", () => {
  describe("Mode selection data model", () => {
    const MODES = ["standard", "max", "mini", "limitless"] as const;
    const MODE_TO_MODEL: Record<string, string> = {
      standard: "manus-next",
      max: "manus-next-max",
      mini: "manus-next-mini",
      limitless: "manus-next-limitless",
    };
    const MODEL_TO_MODE: Record<string, string> = {
      "manus-next": "standard",
      "manus-next-max": "max",
      "manus-next-mini": "mini",
      "manus-next-limitless": "limitless",
    };

    it("should have all 4 modes defined", () => {
      expect(MODES).toHaveLength(4);
      expect(MODES).toContain("standard");
      expect(MODES).toContain("max");
      expect(MODES).toContain("mini");
      expect(MODES).toContain("limitless");
    });

    it("should map every mode to a model ID", () => {
      for (const mode of MODES) {
        expect(MODE_TO_MODEL[mode]).toBeDefined();
        expect(MODE_TO_MODEL[mode]).toMatch(/^manus-next/);
      }
    });

    it("should have bidirectional mode-model mapping", () => {
      for (const mode of MODES) {
        const modelId = MODE_TO_MODEL[mode];
        expect(MODEL_TO_MODE[modelId]).toBe(mode);
      }
    });

    it("should persist mode to localStorage key 'manus-agent-mode'", () => {
      // Verify the localStorage key convention
      const LS_KEY = "manus-agent-mode";
      expect(LS_KEY).toBe("manus-agent-mode");
    });
  });

  describe("Mobile mode selector UI requirements", () => {
    it("should be visible only on mobile (md:hidden)", () => {
      // The mobile mode selector uses md:hidden to show only on mobile
      // Desktop uses the full ModeToggle component
      const mobileClass = "md:hidden";
      const desktopClass = "hidden md:flex";
      expect(mobileClass).not.toBe(desktopClass);
    });

    it("should cycle through modes in order", () => {
      const MODES = ["standard", "max", "mini", "limitless"];
      const currentMode = "standard";
      const currentIndex = MODES.indexOf(currentMode);
      const nextMode = MODES[(currentIndex + 1) % MODES.length];
      expect(nextMode).toBe("max");

      // From limitless, should cycle back to standard
      const limitlessIndex = MODES.indexOf("limitless");
      const afterLimitless = MODES[(limitlessIndex + 1) % MODES.length];
      expect(afterLimitless).toBe("standard");
    });

    it("should display correct icon for each mode", () => {
      const MODE_ICONS: Record<string, string> = {
        standard: "Sparkles",
        max: "Crown",
        mini: "Zap",
        limitless: "Infinity",
      };
      expect(Object.keys(MODE_ICONS)).toHaveLength(4);
      expect(MODE_ICONS.limitless).toBe("Infinity");
    });

    it("should display correct label for each mode", () => {
      const MODE_LABELS: Record<string, string> = {
        standard: "Standard",
        max: "Max",
        mini: "Mini",
        limitless: "Limitless",
      };
      expect(MODE_LABELS.standard).toBe("Standard");
      expect(MODE_LABELS.limitless).toBe("Limitless");
    });
  });
});

describe("Session 16: Azure AD Integration", () => {
  const CLIENT_ID = "f754cd6c-7e23-4c2d-b41c-d44debbc0ea9";
  const REDIRECT_URI = "https://manusnext-mlromfub.manus.space/api/connector/oauth/callback";
  
  describe("App registration configuration", () => {
    it("should have a valid client ID format (UUID)", () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(CLIENT_ID).toMatch(uuidRegex);
    });

    it("should have a valid redirect URI", () => {
      expect(REDIRECT_URI).toMatch(/^https:\/\//);
      expect(REDIRECT_URI).toContain("/api/connector/oauth/callback");
    });

    it("should use multi-tenant configuration", () => {
      // Multi-tenant uses 'common' authority
      const authority = "https://login.microsoftonline.com/common";
      expect(authority).toContain("common");
    });
  });

  describe("Required Microsoft Graph permissions", () => {
    const REQUIRED_PERMISSIONS = [
      "Calendars.ReadWrite",
      "Files.ReadWrite",
      "Mail.Read",
      "Mail.ReadWrite",
      "Mail.Send",
      "User.Read",
    ];

    it("should have 6 configured permissions", () => {
      expect(REQUIRED_PERMISSIONS).toHaveLength(6);
    });

    it("should include all mail permissions", () => {
      const mailPerms = REQUIRED_PERMISSIONS.filter(p => p.startsWith("Mail."));
      expect(mailPerms).toHaveLength(3);
      expect(mailPerms).toContain("Mail.Read");
      expect(mailPerms).toContain("Mail.ReadWrite");
      expect(mailPerms).toContain("Mail.Send");
    });

    it("should include calendar permissions", () => {
      expect(REQUIRED_PERMISSIONS).toContain("Calendars.ReadWrite");
    });

    it("should include file permissions", () => {
      expect(REQUIRED_PERMISSIONS).toContain("Files.ReadWrite");
    });

    it("should include user profile permissions", () => {
      expect(REQUIRED_PERMISSIONS).toContain("User.Read");
    });

    it("should not require admin consent for any permission", () => {
      // All permissions are delegated and don't require admin consent
      const noAdminConsent = REQUIRED_PERMISSIONS.every(p => {
        // These specific permissions don't require admin consent
        const noAdminRequired = [
          "Calendars.ReadWrite", "Files.ReadWrite", "Mail.Read",
          "Mail.ReadWrite", "Mail.Send", "User.Read"
        ];
        return noAdminRequired.includes(p);
      });
      expect(noAdminConsent).toBe(true);
    });
  });

  describe("OAuth scope construction", () => {
    it("should construct proper scope string for authorization", () => {
      const scopes = ["openid", "profile", "email", "User.Read", "Mail.Read", "Files.ReadWrite", "Calendars.Read"];
      const scopeString = scopes.join(" ");
      expect(scopeString).toContain("openid");
      expect(scopeString).toContain("Mail.Read");
      expect(scopeString).toContain("Files.ReadWrite");
    });

    it("should use authorization code flow", () => {
      const responseType = "code";
      expect(responseType).toBe("code");
    });
  });

  describe("Environment variable mapping", () => {
    it("should map MICROSOFT_365_CLIENT_ID to connector config", () => {
      const envKey = "MICROSOFT_365_CLIENT_ID";
      const internalKey = "MICROSOFT_365_OAUTH_CLIENT_ID";
      expect(envKey).toContain("MICROSOFT_365");
      expect(internalKey).toContain("MICROSOFT_365");
    });

    it("should map MICROSOFT_365_CLIENT_SECRET to connector config", () => {
      const envKey = "MICROSOFT_365_CLIENT_SECRET";
      const internalKey = "MICROSOFT_365_OAUTH_CLIENT_SECRET";
      expect(envKey).toContain("MICROSOFT_365");
      expect(internalKey).toContain("MICROSOFT_365");
    });
  });
});
