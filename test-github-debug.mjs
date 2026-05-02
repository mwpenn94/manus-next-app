// Quick test to reproduce the GitHub tool error
const { getUserConnectors, getUserGitHubRepos } = await import("./server/db.ts");

console.log("=== Testing GitHub tool chain ===");

// Get user 1's connectors
try {
  const conns = await getUserConnectors(1);
  console.log("Connectors:", conns.length);
  const ghConn = conns.find(c => c.connectorId === "github" && c.status === "connected");
  if (ghConn) {
    console.log("GitHub connected:", !!ghConn);
    console.log("Has accessToken:", !!ghConn.accessToken);
    console.log("Config type:", typeof ghConn.config);
    console.log("Config keys:", ghConn.config ? Object.keys(ghConn.config) : "null");
    const token = ghConn.accessToken || (ghConn.config)?.token;
    console.log("Token extracted:", token ? `${token.slice(0, 8)}...` : "NULL");
    
    if (token) {
      // Try to validate the token
      const { validateGitHubToken } = await import("./server/githubApi.ts");
      const user = await validateGitHubToken(token);
      console.log("Token valid:", user);
      
      if (user) {
        // Try calling github_ops status
        console.log("\n=== Testing github_ops(status) ===");
        const { executeGitHubOps } = await import("./server/githubOpsTool.ts");
        const result = await executeGitHubOps(
          { mode: "status" },
          { userId: 1 }
        );
        console.log("Result success:", result.success);
        console.log("Result has result:", typeof result.result, result.result?.length);
        if (!result.success) {
          console.log("Error:", result.result);
        } else {
          console.log("Preview:", result.result?.slice(0, 300));
        }
      }
    }
  } else {
    console.log("No GitHub connector found!");
    console.log("All connectors:", conns.map(c => `${c.connectorId}:${c.status}`));
  }
} catch (err) {
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
}

// Get user 1's repos
try {
  const repos = await getUserGitHubRepos(1);
  console.log("\nRepos:", repos.length);
  for (const r of repos) {
    console.log(`  - ${r.fullName} (branch: ${r.defaultBranch}) status=${r.status}`);
  }
} catch (err) {
  console.error("Error getting repos:", err.message);
}

process.exit(0);
