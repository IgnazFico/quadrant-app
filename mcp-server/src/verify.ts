import { spawn } from "node:child_process";
import path from "node:path";

const serverPath = "C:/Users/Nazmc/quadrant/mcp-server/dist/index.js";
const proc = spawn("node", [serverPath], {
  env: {
    ...process.env,
    DATABASE_URL: "postgresql://quadrant_user:Quadrant_079@localhost:5432/quadrant_dev",
  },
});

let buffer = "";

proc.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line.trim());
      console.log("RECEIVED FROM MCP SERVER:", JSON.stringify(msg, null, 2));
      if (msg.id === 2) {
        console.log("\n✅ Tools verified successfully!");
        proc.kill();
        process.exit(0);
      }
    } catch (e) {
      console.log("Raw output:", line);
    }
  }
});

proc.stderr.on("data", (err) => {
  console.error("STDERR:", err.toString());
});

// Step 1: initialize
const initMsg = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-verifier", version: "1.0.0" },
  },
};
proc.stdin.write(JSON.stringify(initMsg) + "\n");

// Step 2: initialized notification
const initializedMsg = {
  jsonrpc: "2.0",
  method: "notifications/initialized",
};
proc.stdin.write(JSON.stringify(initializedMsg) + "\n");

// Step 3: list tools
const listToolsMsg = {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/list",
  params: {},
};
proc.stdin.write(JSON.stringify(listToolsMsg) + "\n");

setTimeout(() => {
  console.log("Timeout waiting for response");
  proc.kill();
  process.exit(1);
}, 5000);
