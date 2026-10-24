// Stand-in for Resend, for SIT only. Run: node scripts/sit/mock-resend.mjs [port]
//   POST /emails          what the app calls (same shape as Resend); stored in memory
//   GET  /last?to=<addr>  the newest message to that address, or 404
//   GET  /count?to=<addr> how many messages that address got
//   POST /fail?on=1|0     make POST /emails answer 500 (simulates a rejected sender)
// The app only talks to it when RESEND_API_URL is set AND NODE_ENV is not
// "production" (lib/mail.ts), so this cannot be used on a deployed site.
import http from "node:http";

const port = Number(process.argv[2] || process.env.MOCK_RESEND_PORT || 4010);
const box = [];
let failing = false;

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const send = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method === "POST" && url.pathname === "/emails") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        if (failing) return send(500, { message: "mock: sender rejected" });
        try {
          const m = JSON.parse(raw);
          box.push({ at: Date.now(), auth: req.headers.authorization ?? "", ...m });
          send(200, { id: `mock-${box.length}` });
        } catch {
          send(400, { message: "bad json" });
        }
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/fail") {
      failing = url.searchParams.get("on") === "1";
      return send(200, { failing });
    }
    const to = url.searchParams.get("to");
    if (req.method === "GET" && url.pathname === "/last") {
      const hit = [...box].reverse().find((m) => m.to === to);
      return hit ? send(200, hit) : send(404, { error: "none" });
    }
    if (req.method === "GET" && url.pathname === "/count") {
      return send(200, { count: box.filter((m) => m.to === to).length });
    }
    send(404, { error: "unknown" });
  })
  .listen(port, "127.0.0.1", () => console.error(`[mock-resend] listening on ${port}`));
