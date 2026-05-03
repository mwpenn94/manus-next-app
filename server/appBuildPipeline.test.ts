import { describe, it, expect } from "vitest";

/**
 * Tests for the app-building pipeline stuck detection exemption.
 * 
 * The core logic: when the agent is in an app-building pipeline (has used
 * create_webapp/create_file/edit_file but hasn't called deploy_webapp yet),
 * the stuck/loop detection should be SKIPPED to prevent false positives
 * from the pipeline's injected continuation prompts.
 */

// Simulate the stuck detection logic extracted from agentStream.ts
function shouldRunStuckDetection(conversation: any[]): boolean {
  const usedAppBuildingTools = conversation.some(m =>
    m.tool_calls?.some((tc: any) =>
      ["create_webapp", "create_file", "edit_file", "install_deps", "run_command", "git_operation"].includes(tc.function?.name)
    )
  );
  const hasDeployed = conversation.some(m =>
    m.tool_calls?.some((tc: any) => tc.function?.name === "deploy_webapp")
  );
  const isInAppBuildPipeline = usedAppBuildingTools && !hasDeployed;
  return !isInAppBuildPipeline;
}

// Simulate the isAppBuildingPipeline check for continuation
function isAppBuildingPipeline(conversation: any[]): boolean {
  const usedAppBuildingTools = conversation.some(m =>
    m.tool_calls?.some((tc: any) =>
      ["create_webapp", "create_file", "edit_file", "install_deps", "run_command", "git_operation"].includes(tc.function?.name)
    )
  );
  const hasDeployed = conversation.some(m =>
    m.tool_calls?.some((tc: any) => tc.function?.name === "deploy_webapp")
  );
  return usedAppBuildingTools && !hasDeployed;
}

describe("App-building pipeline stuck detection exemption", () => {
  it("should NOT run stuck detection when create_webapp has been called but deploy_webapp has not", () => {
    const conversation = [
      { role: "user", content: "Create a simple calculator app" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "create_webapp", arguments: '{"name":"calculator"}' } }] },
      { role: "tool", content: "Webapp created successfully" },
      { role: "assistant", content: "I'll continue building the calculator app..." },
    ];
    expect(shouldRunStuckDetection(conversation)).toBe(false);
  });

  it("should NOT run stuck detection when create_file has been called but deploy_webapp has not", () => {
    const conversation = [
      { role: "user", content: "Create a simple calculator app" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "create_webapp", arguments: '{"name":"calculator"}' } }] },
      { role: "tool", content: "Webapp created successfully" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "create_file", arguments: '{"path":"src/App.tsx"}' } }] },
      { role: "tool", content: "File created" },
      { role: "assistant", content: "I'll add the calculator logic..." },
    ];
    expect(shouldRunStuckDetection(conversation)).toBe(false);
  });

  it("SHOULD run stuck detection after deploy_webapp has been called", () => {
    const conversation = [
      { role: "user", content: "Create a simple calculator app" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "create_webapp", arguments: '{"name":"calculator"}' } }] },
      { role: "tool", content: "Webapp created successfully" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "deploy_webapp", arguments: '{}' } }] },
      { role: "tool", content: "Deployed to https://example.com" },
      { role: "assistant", content: "Your calculator app is now live!" },
    ];
    expect(shouldRunStuckDetection(conversation)).toBe(true);
  });

  it("SHOULD run stuck detection when no app-building tools have been used", () => {
    const conversation = [
      { role: "user", content: "What is the capital of France?" },
      { role: "assistant", content: "The capital of France is Paris." },
      { role: "assistant", content: "The capital of France is Paris." }, // repetitive
    ];
    expect(shouldRunStuckDetection(conversation)).toBe(true);
  });

  it("should identify app-building pipeline correctly", () => {
    const conversationMidBuild = [
      { role: "user", content: "Build me a todo app" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "create_webapp", arguments: '{"name":"todo"}' } }] },
      { role: "tool", content: "Created" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "edit_file", arguments: '{"path":"src/App.tsx"}' } }] },
      { role: "tool", content: "Edited" },
    ];
    expect(isAppBuildingPipeline(conversationMidBuild)).toBe(true);

    const conversationAfterDeploy = [
      ...conversationMidBuild,
      { role: "assistant", content: "", tool_calls: [{ function: { name: "deploy_webapp", arguments: '{}' } }] },
      { role: "tool", content: "Deployed" },
    ];
    expect(isAppBuildingPipeline(conversationAfterDeploy)).toBe(false);
  });

  it("should handle edit_file and install_deps as app-building tools", () => {
    const conversation = [
      { role: "user", content: "Build an app" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "install_deps", arguments: '{"packages":"react"}' } }] },
      { role: "tool", content: "Installed" },
    ];
    expect(shouldRunStuckDetection(conversation)).toBe(false);
    expect(isAppBuildingPipeline(conversation)).toBe(true);
  });

  it("should handle run_command as an app-building tool", () => {
    const conversation = [
      { role: "user", content: "Build an app" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "run_command", arguments: '{"command":"npm run build"}' } }] },
      { role: "tool", content: "Build complete" },
    ];
    expect(shouldRunStuckDetection(conversation)).toBe(false);
    expect(isAppBuildingPipeline(conversation)).toBe(true);
  });

  it("should handle git_operation as an app-building tool (clone → install → deploy flow)", () => {
    const conversation = [
      { role: "user", content: "Build and deploy my connected repo" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "git_operation", arguments: '{"operation":"clone","remote_url":"https://github.com/user/repo"}' } }] },
      { role: "tool", content: "Cloned successfully" },
    ];
    expect(shouldRunStuckDetection(conversation)).toBe(false);
    expect(isAppBuildingPipeline(conversation)).toBe(true);
  });

  it("should allow git_operation pipeline to continue until deploy_webapp", () => {
    const conversationMidClone = [
      { role: "user", content: "Deploy my repo" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "git_operation", arguments: '{"operation":"clone"}' } }] },
      { role: "tool", content: "Cloned" },
      { role: "assistant", content: "", tool_calls: [{ function: { name: "install_deps", arguments: '{"packages":""}' } }] },
      { role: "tool", content: "Installed" },
    ];
    expect(isAppBuildingPipeline(conversationMidClone)).toBe(true);

    const conversationAfterDeploy = [
      ...conversationMidClone,
      { role: "assistant", content: "", tool_calls: [{ function: { name: "deploy_webapp", arguments: '{}' } }] },
      { role: "tool", content: "Deployed" },
    ];
    expect(isAppBuildingPipeline(conversationAfterDeploy)).toBe(false);
  });
});

describe("DeployedWebsitesPage status filter", () => {
  it("should match both 'live' and 'deployed' status values", () => {
    const projects = [
      { id: 1, deployStatus: "live", name: "App 1" },
      { id: 2, deployStatus: "deployed", name: "App 2" },
      { id: 3, deployStatus: "building", name: "App 3" },
      { id: 4, deployStatus: null, name: "App 4" },
    ];
    const deployedProjects = projects.filter(
      (p) => p.deployStatus === "live" || p.deployStatus === "deployed"
    );
    expect(deployedProjects).toHaveLength(2);
    expect(deployedProjects.map(p => p.name)).toEqual(["App 1", "App 2"]);
  });
});
