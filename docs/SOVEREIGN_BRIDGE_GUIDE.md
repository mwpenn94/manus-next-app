# Sovereign Bridge — Developer Guide

## Overview

The Sovereign Bridge is a WebSocket-based protocol that enables external agents, automation tools, and custom integrations to communicate with Manus Next in real time. It provides a bidirectional channel for dispatching tasks, receiving step-by-step progress events, and pushing results back into the platform.

## Architecture

```
┌──────────────────┐         WebSocket (wss://)        ┌──────────────────┐
│  External Agent   │ ◄──────────────────────────────► │   Manus Next     │
│  (your code)      │    JSON messages over WS          │   Bridge Server  │
└──────────────────┘                                    └──────────────────┘
        │                                                        │
        │  task:start, task:step,                                │
        │  task:complete, task:error                              │
        │  ◄────────────────────────────────────────────────────►│
        │                                                        │
        │  Custom events (your protocol)                         │
        │  ◄────────────────────────────────────────────────────►│
```

## Connection

### Endpoint

Connect to the Bridge WebSocket endpoint at your Manus Next instance:

```
wss://your-instance.manus.space/api/bridge
```

### Authentication

The Bridge uses JWT-based authentication. Include your API key in the initial connection handshake:

```javascript
const ws = new WebSocket("wss://your-instance.manus.space/api/bridge");

ws.onopen = () => {
  // Authenticate immediately after connection
  ws.send(JSON.stringify({
    type: "auth",
    apiKey: "your-bridge-api-key"
  }));
};
```

The server responds with:

```json
{ "type": "auth:success", "userId": "..." }
```

or

```json
{ "type": "auth:error", "message": "Invalid API key" }
```

### Configuration

Generate your Bridge API key in **Settings → Bridge** within Manus Next. You can also configure the Bridge URL and enable auto-connect from the same panel.

## Message Protocol

All messages are JSON objects with a required `type` field.

### Client → Server Messages

| Type | Description | Payload |
|------|-------------|---------|
| `auth` | Authenticate the connection | `{ apiKey: string }` |
| `task:start` | Start a new task | `{ taskId: string, prompt: string, attachments?: string[] }` |
| `task:cancel` | Cancel a running task | `{ taskId: string }` |
| `ping` | Keep-alive heartbeat | `{}` |
| Custom | Any custom event type | `{ ...yourPayload }` |

### Server → Client Messages

| Type | Description | Payload |
|------|-------------|---------|
| `auth:success` | Authentication succeeded | `{ userId: string }` |
| `auth:error` | Authentication failed | `{ message: string }` |
| `task:step` | Task progress update | `{ taskId: string, stepIndex: number, tool: string, status: string, content?: string }` |
| `task:complete` | Task finished successfully | `{ taskId: string, result: string }` |
| `task:error` | Task encountered an error | `{ taskId: string, error: string }` |
| `pong` | Heartbeat response | `{ latencyMs: number }` |

## Example: Python External Agent

```python
import asyncio
import json
import websockets

BRIDGE_URL = "wss://your-instance.manus.space/api/bridge"
API_KEY = "your-bridge-api-key"

async def agent():
    async with websockets.connect(BRIDGE_URL) as ws:
        # Authenticate
        await ws.send(json.dumps({
            "type": "auth",
            "apiKey": API_KEY
        }))
        
        auth_response = json.loads(await ws.recv())
        if auth_response["type"] != "auth:success":
            print(f"Auth failed: {auth_response}")
            return
        
        print("Connected to Manus Next Bridge")
        
        # Start a task
        await ws.send(json.dumps({
            "type": "task:start",
            "taskId": "ext-001",
            "prompt": "Research the latest AI safety papers and summarize findings"
        }))
        
        # Listen for events
        async for message in ws:
            event = json.loads(message)
            
            if event["type"] == "task:step":
                print(f"  Step {event['stepIndex']}: {event['tool']} — {event['status']}")
            
            elif event["type"] == "task:complete":
                print(f"Task complete: {event['result'][:200]}...")
                break
            
            elif event["type"] == "task:error":
                print(f"Task error: {event['error']}")
                break

asyncio.run(agent())
```

## Example: Node.js External Agent

```javascript
const WebSocket = require("ws");

const ws = new WebSocket("wss://your-instance.manus.space/api/bridge");

ws.on("open", () => {
  ws.send(JSON.stringify({ type: "auth", apiKey: "your-bridge-api-key" }));
});

ws.on("message", (data) => {
  const event = JSON.parse(data);
  
  switch (event.type) {
    case "auth:success":
      console.log("Authenticated. Starting task...");
      ws.send(JSON.stringify({
        type: "task:start",
        taskId: "ext-002",
        prompt: "Analyze market trends for AI infrastructure companies"
      }));
      break;
    
    case "task:step":
      console.log(`Step ${event.stepIndex}: ${event.tool} — ${event.status}`);
      break;
    
    case "task:complete":
      console.log("Done:", event.result.slice(0, 200));
      ws.close();
      break;
    
    case "task:error":
      console.error("Error:", event.error);
      ws.close();
      break;
  }
});
```

## Connection Quality and Reconnection

The Bridge client includes built-in connection quality monitoring:

- **Latency tracking**: Ping/pong heartbeats measure round-trip time
- **Exponential backoff**: Reconnection attempts use exponential backoff (1s, 2s, 4s, 8s, 16s) with a maximum of 5 retries
- **Auto-reconnect**: If configured in Settings, the Bridge automatically reconnects on page load

### Monitoring Connection Health

```javascript
// In your React component using the Bridge context
const { status, quality } = useBridge();

// status: "disconnected" | "connecting" | "connected" | "authenticating" | "error"
// quality.latencyMs: number | null (round-trip latency in ms)
// quality.reconnectCount: number (how many reconnections have occurred)
// quality.lastPingAt: Date | null
```

## Custom Event Types

You can define your own event types for domain-specific communication:

```javascript
// Send a custom event from your external agent
ws.send(JSON.stringify({
  type: "custom:data-update",
  payload: {
    source: "crm",
    records: [{ id: 1, name: "Acme Corp", status: "active" }]
  }
}));
```

In Manus Next, listen for custom events using the Bridge context:

```tsx
const { onTaskEvent } = useBridge();

useEffect(() => {
  const unsubscribe = onTaskEvent((event) => {
    if (event.type === "custom:data-update") {
      // Handle your custom event
      console.log("Data update:", event.payload);
    }
  });
  return unsubscribe;
}, []);
```

## Security Considerations

1. **API keys** are scoped per user and stored encrypted in the database
2. **JWT validation** occurs on every connection attempt
3. **Rate limiting** prevents abuse (configurable in server settings)
4. **TLS required** in production — always use `wss://`, never `ws://`
5. **Event logging** — all Bridge events are logged for audit purposes in the Events tab (Settings → Bridge)

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Connection drops immediately | Invalid API key | Regenerate key in Settings → Bridge |
| "auth:error" response | Expired or revoked key | Generate a new key |
| High latency (>500ms) | Network distance | Deploy closer to your Manus instance |
| Reconnection loop | Server unreachable | Check server status and firewall rules |
| Events not received | Not authenticated | Ensure auth handshake completes before sending |
