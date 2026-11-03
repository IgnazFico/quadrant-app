import { test, expect } from "@playwright/test";
import { createRolesSchema, MAX_ROLES_PER_REQUEST, SEALED_MIN_BYTES } from "../lib/sealed";

// WO-050 / SEC-003: the roles list has a size limit. Pure schema test.
const role = { domain: "Parent", label: Buffer.alloc(SEALED_MIN_BYTES + 8).toString("base64") };
const n = (k: number) => ({ roles: Array.from({ length: k }, () => role) });

test("roles list accepts the limit and rejects one more", () => {
  expect(createRolesSchema.safeParse(n(MAX_ROLES_PER_REQUEST)).success).toBe(true);
  expect(createRolesSchema.safeParse(n(MAX_ROLES_PER_REQUEST + 1)).success).toBe(false);
  expect(createRolesSchema.safeParse(n(0)).success).toBe(false);
});
