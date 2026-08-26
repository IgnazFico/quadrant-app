import { z } from "zod";

export const emailSchema = z.email("Enter a valid email");

// Length-based only — this password also derives an encryption key,
// so we care more about entropy than arbitrary complexity rules.
export const passwordSchema = z
  .string()
  .min(
    10,
    "Use at least 10 characters — this also protects your private entries",
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const recoverStartSchema = z.object({
  email: emailSchema,
  recoveryCode: z.string().min(1, "Enter your recovery code"),
});

export const recoverFinishSchema = z.object({
  newPassword: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
