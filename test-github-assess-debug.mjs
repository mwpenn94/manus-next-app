console.log("=== Testing github_assess ===");
try {
  const { executeGitHubAssess } = await import("./server/githubAssessTool.ts");
  const result = await executeGitHubAssess(
    { mode: "assess" },
    { userId: 1 }
  );
  console.log("Result success:", result.success);
  console.log("Result type:", typeof result.result);
  console.log("Result length:", result.result?.length);
  if (!result.success) {
    console.log("Error:", result.result);
  } else {
    console.log("Preview:", result.result?.slice(0, 500));
  }
} catch (err) {
  console.error("UNCAUGHT ERROR:", err.message);
  console.error("Stack:", err.stack);
}
process.exit(0);
