import dotenv from "dotenv";
dotenv.config();

const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

console.log("API URL:", apiUrl ? apiUrl.slice(0, 40) + "..." : "MISSING");
console.log("API Key:", apiKey ? apiKey.slice(0, 10) + "..." : "MISSING");

if (!apiUrl || !apiKey) {
  console.error("Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY");
  process.exit(1);
}

const payload = {
  model: "gemini-2.5-flash",
  messages: [
    { role: "user", content: "What is 2+2? Answer in one word." }
  ],
  max_tokens: 100,
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
  console.log("Response:", JSON.stringify(data, null, 2).slice(0, 500));
  
  if (data.choices?.[0]?.message?.content) {
    console.log("\n✅ LLM WORKS! Content:", data.choices[0].message.content);
  } else {
    console.log("\n❌ LLM returned no content");
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
