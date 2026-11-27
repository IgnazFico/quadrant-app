import { useId, type CSSProperties } from "react";
import { FABRIC_COLORS, HAIR_COLORS, SKIN, piecesFor } from "../../lib/avatar/manifest";
import type { AvatarCodes } from "../../lib/avatar/types";

const INK = "#2B2620";
const NEUTRAL = "#D9D3C7";
const BG = "#F1EEE7";

const swatch = (palette: string[], i: number) => palette[i] ?? palette[0];

type AvatarProps = { codes: AvatarCodes | null; size: number; label?: string };

export function Avatar({ codes, size, label }: AvatarProps) {
  // Colons from useId() are fine in HTML ids but ugly in url(#…) refs, so strip them.
  const clipId = `avatar-clip-${useId().replace(/:/g, "")}`;
  const vars = codes
    ? ({
        "--skin": swatch(SKIN, codes.skin),
        "--hair": swatch(HAIR_COLORS, codes.hairColor),
        "--fabric": swatch(FABRIC_COLORS, codes.fabric),
      } as CSSProperties)
    : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label ?? "Your avatar"}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill={BG} />
      <g clipPath={`url(#${clipId})`} style={vars}>
        {codes === null ? (
          <>
            <path
              d="M56 58 V74 C67 74 76 82 80 100 H20 C24 82 33 74 44 74 V58 Z"
              fill={NEUTRAL}
              stroke={INK}
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
            <circle cx="50" cy="40" r="16" fill={NEUTRAL} stroke={INK} strokeWidth={2.4} />
          </>
        ) : (
          // Piece markup is a static bundled string checked by scripts/verify-avatar-manifest.ts (no user input).
          piecesFor(codes).map((piece) => (
            <g key={piece.id} dangerouslySetInnerHTML={{ __html: piece.svg }} />
          ))
        )}
      </g>
    </svg>
  );
}
