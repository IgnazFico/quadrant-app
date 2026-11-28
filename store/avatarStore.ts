import { create } from "zustand";
import type { AvatarCodes } from "../lib/avatar/types";

/** Decrypted avatar codes for the top bar. Memory only: never persisted, never sent. */
export const useAvatarStore = create<{
  av: AvatarCodes | null;
  setAv: (av: AvatarCodes | null) => void;
}>((set) => ({ av: null, setAv: (av) => set({ av }) }));
