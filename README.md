This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## AUTH FEATURE CONSIDERATIONS

## How the pieces fit together

- `lib/crypto.ts` — the ONLY file that should ever touch key material.
  Runs client-side exclusively (browser or Capacitor). Uses libsodium's
  Argon2id for password/recovery-code derivation and XSalsa20-Poly1305
  (`crypto_secretbox`) for wrapping/encryption.
- `lib/auth.ts` — Auth.js config. Verifies login via bcrypt, issues a
  session. Has no knowledge of the encryption key.
- `store/authStore.ts` — holds the decrypted master key in memory for the
  active session. Not persisted — do not add Zustand's `persist`
  middleware to this store.
- `app/api/auth/register` — stores the bcrypt password hash (for login)
  and the wrapped key material (for encryption) as opaque ciphertext.
- `app/api/auth/login-challenge` — returns the salt + wrapped key needed
  for the client to attempt local unwrapping before/alongside the actual
  login POST.
- `app/api/auth/recover-challenge` + `app/api/auth/recover` — same idea,
  via the recovery code instead of the password.

## Known simplifications (flagged for production hardening)

- `login-challenge` and `recover-challenge` currently return a 404 for
  unknown emails, which allows account enumeration. Return a deterministic
  fake salt/blob for unknown emails instead.
- `recover` trusts email + recovery code over a bare POST. In production,
  gate this behind a short-lived, single-use token (e.g. emailed) proving
  account control, in addition to the recovery code.
- Argon2 parameters use `MODERATE` cost. Benchmark on real target devices
  (especially low-end Android, if wrapped with Capacitor) and adjust.
- `AuthForm.tsx` assumes plain Tailwind utility classes rather than
  shadcn/ui primitives, so it has no extra setup dependency. Swap in
  `@/components/ui/button`, `input`, etc. once shadcn is initialized in
  the real repo, if preferred.
