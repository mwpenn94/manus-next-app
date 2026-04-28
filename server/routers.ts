import { aegisRouter } from "./routers/aegis";
import { automationRouter } from "./routers/automation";
import { atlasRouter } from "./routers/atlas";
import { branchesRouter } from "./routers/branches";
import { bridgeRouter } from "./routers/bridge";
import { browserRouter } from "./routers/browser";
import { fileRouter } from "./routers/file";
import { preferencesRouter } from "./routers/preferences";
import { sovereignRouter } from "./routers/sovereign";
import { taskRouter } from "./routers/task";
import { webappProjectRouter } from "./routers/webappProject";
import { appPublishRouter } from "./routers/appPublish";
import { cacheRouter } from "./routers/cache";
import { connectorRouter } from "./routers/connector";
import { designRouter } from "./routers/design";
import { deviceRouter } from "./routers/device";
import { gdprRouter } from "./routers/gdpr";
import { githubRouter } from "./routers/github";
import { libraryRouter } from "./routers/library";
import { llmRouter } from "./routers/llm";
import { meetingRouter } from "./routers/meeting";
import { memoryRouter } from "./routers/memory";
import { mobileProjectRouter } from "./routers/mobileProject";
import { notificationRouter } from "./routers/notification";
import { paymentRouter } from "./routers/payment";
import { projectRouter } from "./routers/project";
import { replayRouter } from "./routers/replay";
import { scheduleRouter } from "./routers/schedule";
import { shareRouter } from "./routers/share";
import { ogImageRouter } from "./routers/ogImage";
import { skillRouter } from "./routers/skill";
import { slidesRouter } from "./routers/slides";
import { teamRouter } from "./routers/team";
import { templatesRouter } from "./routers/templates";
import { usageRouter } from "./routers/usage";
import { videoRouter } from "./routers/video";
import { voiceRouter } from "./routers/voice";
import { pipelineRouter } from "./routers/pipeline";
import { documentRouter } from "./routers/document";
import { browserAutomationRouter } from "./routers/browserAutomation";
import { systemHealthRouter } from "./routers/systemHealth";
import { researchRouter } from "./routers/research";
import { dataAnalysisRouter } from "./routers/dataAnalysis";
import { musicRouter } from "./routers/music";
import { videoWorkerRouter } from "./routers/videoWorker";
import { webappRouter } from "./routers/webapp";
import { feedbackRouter } from "./routers/feedback";
import { orchestrationRouter } from "./routers/orchestration";
import { workspaceRouter } from "./routers/workspace";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  aegis: aegisRouter,
  atlas: atlasRouter,
  branches: branchesRouter,
  bridge: bridgeRouter,
  browser: browserRouter,
  feedback: feedbackRouter,
  orchestration: orchestrationRouter,
  file: fileRouter,
  preferences: preferencesRouter,
  sovereign: sovereignRouter,
  task: taskRouter,
  webappProject: webappProjectRouter,
  appPublish: appPublishRouter,
  cache: cacheRouter,
  connector: connectorRouter,
  design: designRouter,
  device: deviceRouter,
  gdpr: gdprRouter,
  github: githubRouter,
  library: libraryRouter,
  llm: llmRouter,
  meeting: meetingRouter,
  memory: memoryRouter,
  mobileProject: mobileProjectRouter,
  notification: notificationRouter,
  payment: paymentRouter,
  project: projectRouter,
  replay: replayRouter,
  schedule: scheduleRouter,
  share: shareRouter,
  ogImage: ogImageRouter,
  skill: skillRouter,
  slides: slidesRouter,
  team: teamRouter,
  templates: templatesRouter,
  usage: usageRouter,
  video: videoRouter,
  voice: voiceRouter,
  webapp: webappRouter,
  workspace: workspaceRouter,
  automation: automationRouter,
  pipeline: pipelineRouter,
  document: documentRouter,
  browserAutomation: browserAutomationRouter,
  systemHealth: systemHealthRouter,
  research: researchRouter,
  dataAnalysis: dataAnalysisRouter,
  music: musicRouter,
  videoWorker: videoWorkerRouter,
});

export type AppRouter = typeof appRouter;
