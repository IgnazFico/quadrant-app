import { Ms_Madi } from "next/font/google";

/**
 * The user's signature hand. Ms Madi: a pen signature that stays legible
 * and sits quietly next to Fraunces / Plus Jakarta Sans.
 *
 * Imported only where a signature is written or replayed (the mission
 * statement flow and the year-end ceremony), so other routes don't download
 * it. Use `.className` directly, or `.variable` to expose --font-signature.
 * Single weight (400): don't set font-weight on it, or the browser fakes bold.
 */
export const signatureFont = Ms_Madi({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-signature",
  display: "swap",
});
