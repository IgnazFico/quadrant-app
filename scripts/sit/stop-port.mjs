// Stops whatever listens on the given port (the SIT server started by this work order).
import { execSync } from "node:child_process";
const port = Number(process.argv[2]);
const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
for (const line of out.split(/\r?\n/)) {
  const m = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
  if (m && Number(m[1]) === port) {
    try { process.kill(Number(m[2])); console.log("stopped server pid", m[2]); } catch (e) { console.log("could not stop", m[2], e.code); }
  }
}
