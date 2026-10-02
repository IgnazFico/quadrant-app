"use server";

import { signOut } from "./auth";

/**
 * Ends the Auth.js session and sends the user to /login.
 *
 * The client-side master key lives in sessionStorage (store/authStore.ts)
 * and is NOT touched by this server action — callers must run
 * useAuthStore.getState().clearMasterKey() before submitting, or the
 * decrypted key would survive sign-out for the rest of the tab session.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
