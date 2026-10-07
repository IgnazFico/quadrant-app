import { Fraunces, Source_Serif_4 } from "next/font/google";
import { signatureFont } from "../../../../../../lib/signatureFont";

/**
 * Fonts used only by the year-end ceremony, so the rest of the app
 * doesn't download them. See components/yearreview/ceremony/ceremony.css.
 *
 *   Fraunces (SOFT/WONK/opsz axes, italic)  Quadrant's voice
 *   Source Serif 4 italic                   the user's own words
 *   Ms Madi (lib/signatureFont)             the signature, same hand as signing
 */
const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-yc-display",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  style: ["italic"],
  variable: "--font-yc-serif",
  display: "swap",
});

export default function YearReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${serif.variable} ${signatureFont.variable}`}>{children}</div>
  );
}
