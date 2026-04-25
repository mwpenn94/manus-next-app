import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { 
  createAppBuild,
  getBuildByExternalId,
  getProjectBuilds,
  getUserBuilds,
  updateBuildStatus,
  updateBuildStoreMetadata,
 } from "../db";

export const appPublishRouter = router({
    builds: protectedProcedure
      .input(z.object({ mobileProjectId: z.number() }))
      .query(async ({ input }) => {
        return getProjectBuilds(input.mobileProjectId);
      }),
    userBuilds: protectedProcedure.query(async ({ ctx }) => {
      return getUserBuilds(ctx.user.id);
    }),
    getBuild: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const build = await getBuildByExternalId(input.externalId);
        if (!build || build.userId !== ctx.user.id) return null;
        return build;
      }),
    createBuild: protectedProcedure
      .input(z.object({
        mobileProjectId: z.number(),
        platform: z.enum(["ios", "android", "web_pwa"]),
        buildMethod: z.enum(["pwa_manifest", "capacitor_local", "github_actions", "expo_eas", "manual_xcode", "manual_android_studio"]),
        version: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createAppBuild({
          userId: ctx.user.id,
          mobileProjectId: input.mobileProjectId,
          platform: input.platform,
          buildMethod: input.buildMethod,
          version: input.version || "1.0.0",
          status: "queued",
        });
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["queued", "building", "success", "failed", "cancelled"]),
        artifactUrl: z.string().optional(),
        buildLog: z.string().optional(),
        errorMessage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, status, ...extras } = input;
        await updateBuildStatus(id, status, extras);
        return { success: true };
      }),
    updateStoreMetadata: protectedProcedure
      .input(z.object({
        buildId: z.number(),
        title: z.string().optional(),
        shortDescription: z.string().optional(),
        fullDescription: z.string().optional(),
        category: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        screenshotUrls: z.array(z.string()).optional(),
        privacyPolicyUrl: z.string().optional(),
        supportUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { buildId, ...metadata } = input;
        await updateBuildStoreMetadata(buildId, metadata);
        return { success: true };
      }),
    /** Generate GitHub Actions workflow for automated builds */
    generateGitHubWorkflow: protectedProcedure
      .input(z.object({
        framework: z.enum(["pwa", "capacitor", "expo"]),
        platform: z.enum(["ios", "android", "web_pwa"]),
        buildOnPush: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const triggers = input.buildOnPush ? "push:\n    branches: [main]" : "workflow_dispatch:";
        let workflow = "";
        if (input.framework === "pwa" || input.platform === "web_pwa") {
          workflow = `name: Build PWA\non:\n  ${triggers}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm ci\n      - run: npm run build\n      - uses: actions/upload-artifact@v4\n        with:\n          name: pwa-dist\n          path: dist/`;
        } else if (input.framework === "capacitor" && input.platform === "android") {
          workflow = `name: Build Android (Capacitor)\non:\n  ${triggers}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - uses: actions/setup-java@v4\n        with:\n          distribution: temurin\n          java-version: 17\n      - run: npm ci\n      - run: npm run build\n      - run: npx cap sync android\n      - run: cd android && ./gradlew assembleRelease\n      - uses: actions/upload-artifact@v4\n        with:\n          name: android-apk\n          path: android/app/build/outputs/apk/release/`;
        } else if (input.framework === "capacitor" && input.platform === "ios") {
          workflow = `name: Build iOS (Capacitor)\non:\n  ${triggers}\njobs:\n  build:\n    runs-on: macos-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm ci\n      - run: npm run build\n      - run: npx cap sync ios\n      - run: cd ios/App && xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -archivePath build/App.xcarchive archive\n      - uses: actions/upload-artifact@v4\n        with:\n          name: ios-archive\n          path: ios/App/build/`;
        } else if (input.framework === "expo") {
          workflow = `name: Build with EAS\non:\n  ${triggers}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - uses: expo/expo-github-action@v8\n        with:\n          eas-version: latest\n          token: \${{ secrets.EXPO_TOKEN }}\n      - run: npm ci\n      - run: eas build --platform ${input.platform === "ios" ? "ios" : "android"} --non-interactive`;
        }
        return { workflow, filename: `.github/workflows/build-${input.platform}.yml` };
      }),
    /** Get the publishing checklist for a platform */
    getPublishChecklist: protectedProcedure
      .input(z.object({ platform: z.enum(["ios", "android", "web_pwa"]) }))
      .query(async ({ input }) => {
        const checklists: Record<string, Array<{ item: string; required: boolean; description: string }>> = {
          web_pwa: [
            { item: "PWA Manifest", required: true, description: "Valid manifest.json with name, icons, start_url, display" },
            { item: "Service Worker", required: true, description: "Registered service worker for offline support" },
            { item: "HTTPS", required: true, description: "Site must be served over HTTPS" },
            { item: "App Icons", required: true, description: "192x192 and 512x512 PNG icons" },
            { item: "Lighthouse Score", required: false, description: "PWA score ≥ 90 in Lighthouse audit" },
            { item: "Splash Screen", required: false, description: "Custom splash screen for app launch" },
          ],
          android: [
            { item: "Signed APK/AAB", required: true, description: "Release build signed with upload key" },
            { item: "App Icon", required: true, description: "512x512 PNG icon for Play Store listing" },
            { item: "Feature Graphic", required: true, description: "1024x500 PNG feature graphic" },
            { item: "Screenshots", required: true, description: "2-8 screenshots per device type" },
            { item: "Privacy Policy", required: true, description: "Public URL to privacy policy" },
            { item: "Content Rating", required: true, description: "Complete IARC content rating questionnaire" },
            { item: "Store Listing", required: true, description: "Title, short description, full description" },
            { item: "Google Play Developer Account", required: true, description: "$25 one-time registration fee" },
          ],
          ios: [
            { item: "Signed IPA", required: true, description: "Release build signed with distribution certificate" },
            { item: "App Icon", required: true, description: "1024x1024 PNG icon (no alpha)" },
            { item: "Screenshots", required: true, description: "Screenshots for each required device size" },
            { item: "Privacy Policy", required: true, description: "Public URL to privacy policy" },
            { item: "App Review Info", required: true, description: "Demo account credentials and review notes" },
            { item: "Store Listing", required: true, description: "Title, subtitle, description, keywords" },
            { item: "Apple Developer Account", required: true, description: "$99/year enrollment" },
            { item: "App Store Connect", required: true, description: "App record created in App Store Connect" },
          ],
        };
        return checklists[input.platform] ?? [];
      }),
  });
