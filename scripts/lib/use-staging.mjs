// Side-effect import: point this process at STAGING before anything else loads.
// Put it as the FIRST import of any staging-only script, ahead of lib/prisma
// (which reads DATABASE_URL at import time):
//   import "./lib/use-staging.mjs";
// Throws if the resolved URL is the production host.
import { loadEnv } from "./env.mjs";

loadEnv("staging");
