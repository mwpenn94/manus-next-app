import dotenv from "dotenv";
dotenv.config();

const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

// Minimal tool set to test
const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" }
        },
        required: ["query"]
      }
    }
  }
];

const payload = {
  model: "gemini-2.5-flash",
  messages: [
    { role: "system", content: "You are a helpful assistant. Answer the user's question directly." },
    { role: "user", content: "What is 2+2? Answer in one sentence." }
  ],
  tools,
  tool_choice: "auto",
  max_tokens: 500,
  thinking: { budget_tokens: 1024 },
};

try {
  const response = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  console.log("Status:", response.status, response.statusText);
  const data = await response.json();
  
  if (data.choices?.[0]) {
    console.log("✅ Got choices[0]");
    console.log("Content:", data.choices[0].message?.content);
    console.log("Tool calls:", JSON.stringify(data.choices[0].message?.tool_calls)?.slice(0, 200));
    console.log("Finish reason:", data.choices[0].finish_reason);
  } else {
    console.log("❌ No choices in response");
    console.log("Full response:", JSON.stringify(data, null, 2).slice(0, 1000));
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
