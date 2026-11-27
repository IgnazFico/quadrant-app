"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { blankAvatar, shuffleAvatar } from "../../lib/avatar/codec";
import { FABRIC_COLORS, HAIR_COLORS, PIECES, SKIN, maxCode, type Piece } from "../../lib/avatar/manifest";
import { NAME_MAX, type AvatarCodes, type CardData } from "../../lib/avatar/types";
import { Avatar } from "./Avatar";

// Same desktop breakpoint and store as ReflectModal.
const DESKTOP = "(min-width: 768px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(DESKTOP);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useIsDesktop = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false);

type PieceGroup = Piece["group"];

// Tab order is the card's order; each tab edits one AvatarCodes key.
const TABS: { key: keyof AvatarCodes; label: string; name: string; palette?: string[] }[] = [
  { key: "face", label: "Face", name: "Face" },
  { key: "skin", label: "Skin", name: "Skin tone", palette: SKIN },
  { key: "eyes", label: "Eyes", name: "Eyes" },
  { key: "brows", label: "Brows", name: "Brows" },
  { key: "nose", label: "Nose", name: "Nose" },
  { key: "mouth", label: "Mouth", name: "Mouth" },
  { key: "hair", label: "Hair", name: "Hair" },
  { key: "hairColor", label: "Hair colour", name: "Hair colour", palette: HAIR_COLORS },
  { key: "cover", label: "Cover", name: "Cover" },
  { key: "fabric", label: "Fabric", name: "Fabric", palette: FABRIC_COLORS },
  { key: "facial", label: "Facial hair", name: "Facial hair" },
  { key: "extra", label: "Extra", name: "Extra" },
];

/** One option's art as markup: that code's pieces (plus the base for a face), layer order. */
function optionSvg(group: PieceGroup, code: number): string {
  return PIECES.filter((p) =>
    p.group === group ? p.code === code : group === "face" && code > 0 && p.group === "base",
  )
    .sort((a, b) => a.layer - b.layer)
    .map((p) => p.svg)
    .join("");
}

export function AvatarEditor(props: AvatarEditorProps) {
  const isDesktop = useIsDesktop();
  // Nothing renders on the server: portals are client-only, and this dialog
  // only mounts after a click in the parent.
  if (typeof document === "undefined") return null;
  // Portal to <body> so no ancestor (sticky rail, blurred top bar) can clip
  // or re-anchor the fixed overlay.
  return createPortal(<AvatarEditorDialog {...props} desktop={isDesktop} />, document.body);
}

type AvatarEditorProps = {
  initial: CardData;
  onSave(card: CardData): Promise<void>;
  onClose(): void;
  notice?: string;
};

/** The dialog body, exported for render checks (the portal does not render on the server). */
export function AvatarEditorDialog({
  initial,
  onSave,
  onClose,
  notice,
  desktop = true,
}: AvatarEditorProps & { desktop?: boolean }) {
  const [codes, setCodes] = useState<AvatarCodes>(initial.av ?? blankAvatar());
  const [name, setName] = useState(initial.name ?? "");
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const restoreRef = useRef<Element | null>(null);

  const active = TABS[tab];
  const options = active.palette ? active.palette.length : maxCode(active.key as PieceGroup) + 1;
  const tooLong = [...name].length > NAME_MAX;
  const canSave = !saving && !tooLong;
  const vars = {
    "--skin": SKIN[codes.skin] ?? SKIN[0],
    "--hair": HAIR_COLORS[codes.hairColor] ?? HAIR_COLORS[0],
    "--fabric": FABRIC_COLORS[codes.fabric] ?? FABRIC_COLORS[0],
  } as CSSProperties;

  async function save() {
    if (!canSave) return;
    const trimmed = name.trim();
    const card: CardData = {
      v: 1,
      av: Object.values(codes).every((v) => v === 0) ? null : codes,
    };
    if (trimmed) card.name = trimmed;
    setSaving(true);
    setError(null);
    try {
      await onSave(card);
    } catch {
      setSaving(false);
      setError("Couldn't save your card. Try again.");
    }
  }

  // Esc closes; Tab cycles inside the dialog; page scroll is locked. On close,
  // focus goes back where it came from.
  useEffect(() => {
    restoreRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, []);

  function onDialogKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      if (!saving) onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button, input") ?? []).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex >= 0,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const inside = items.includes(document.activeElement as HTMLElement);
    if (e.shiftKey && (!inside || document.activeElement === first)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
      e.preventDefault();
      first.focus();
    }
  }

  function onTabKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>, i: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + TABS.length) % TABS.length;
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  function onTileKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>, code: number) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    const next = (code + step + options) % options;
    setCodes({ ...codes, [active.key]: next });
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-code="${next}"]`)?.focus();
  }

  const tile =
    "grid h-11 w-11 place-items-center overflow-hidden rounded-lg border bg-[#FFF9F2] transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B2620]";
  const on = "border-[#2B2620] ring-2 ring-[#2B2620]";
  const off = "border-[#E5E1D8] hover:bg-white";

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-[rgba(31,41,55,0.3)] ${
        desktop ? "items-center p-4" : "items-end"
      }`}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onDialogKeyDown}
        className={
          desktop
            ? "flex max-h-full w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-2xl bg-[#FFF9F2] p-6 shadow-[0_24px_60px_rgba(31,41,55,0.22)]"
            : "flex max-h-[92vh] w-full max-w-[440px] flex-col gap-4 overflow-y-auto rounded-t-[20px] bg-[#FFF9F2] px-5 pb-7 pt-2.5"
        }
      >
        {!desktop && <div className="mx-auto h-1 w-9 shrink-0 rounded-full bg-[#E5E1D8]" aria-hidden="true" />}
        {notice && <p className="text-[12px] leading-relaxed text-[#9CA3AF]">{notice}</p>}

        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="font-serif text-[20px] font-semibold text-[#2B2620]">
            Your card
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="-mr-1.5 rounded-lg p-1.5 text-[#9CA3AF] hover:bg-white hover:text-[#2B2620] transition-colors motion-reduce:transition-none"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar codes={Object.values(codes).every((v) => v === 0) ? null : codes} size={96} />
          <div className="min-w-0 flex-1">
            <label
              htmlFor={`${titleId}-name`}
              className="mb-1 flex font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9CA3AF]"
            >
              Name
            </label>
            <input
              id={`${titleId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              placeholder="Your name"
              className="w-full rounded-lg border border-[#E5E1D8] bg-white px-3 py-2.5 text-sm text-[#2B2620] outline-none focus:border-[#FB923C] disabled:opacity-60"
            />
            {tooLong && <p className="mt-1 text-[11.5px] text-[#C0392B]">Up to {NAME_MAX} characters</p>}
          </div>
        </div>

        <div role="tablist" aria-label="Avatar parts" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${titleId}-tab-${t.key}`}
              aria-selected={i === tab}
              aria-controls={`${titleId}-panel`}
              tabIndex={i === tab ? 0 : -1}
              onClick={() => setTab(i)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={`shrink-0 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors motion-reduce:transition-none ${
                i === tab ? "bg-[#2B2620] text-[#FFF9F2]" : "text-[#9CA3AF] hover:bg-white hover:text-[#2B2620]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          ref={groupRef}
          role="tabpanel"
          id={`${titleId}-panel`}
          aria-labelledby={`${titleId}-tab-${active.key}`}
        >
          <div role="radiogroup" aria-label={active.name} className="grid grid-cols-5 gap-2">
            {Array.from({ length: options }, (_, code) => {
              const selected = codes[active.key] === code;
              const svg = active.palette ? "" : optionSvg(active.key as PieceGroup, code);
              return (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={active.palette ? `${active.name} ${code + 1}` : code === 0 ? "None" : `${active.name} ${code}`}
                  data-code={code}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setCodes({ ...codes, [active.key]: code })}
                  onKeyDown={(e) => onTileKeyDown(e, code)}
                  className={`${tile} ${selected ? on : off}`}
                >
                  {active.palette ? (
                    <span
                      className="h-7 w-7 rounded-full border border-[#E5E1D8]"
                      style={{ background: active.palette[code] }}
                      aria-hidden="true"
                    />
                  ) : (
                    svg && (
                      <svg viewBox="0 0 100 100" className="h-full w-full" style={vars} aria-hidden="true">
                        {/* Static bundled art from lib/avatar/manifest.ts, never user input. */}
                        <g dangerouslySetInnerHTML={{ __html: svg }} />
                      </svg>
                    )
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">{error}</p>}

        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCodes(shuffleAvatar())}
            disabled={saving}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#9CA3AF] hover:bg-white hover:text-[#2B2620] transition-colors motion-reduce:transition-none"
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => {
              setCodes(blankAvatar());
              setName("");
            }}
            disabled={saving}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#9CA3AF] hover:bg-white hover:text-[#2B2620] transition-colors motion-reduce:transition-none"
          >
            Start over
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#E5E1D8] bg-white px-4 py-2.5 text-sm font-semibold text-[#2B2620] hover:bg-[#FCFBF8]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#EA6A0C] disabled:bg-[#F0D9C6]"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
