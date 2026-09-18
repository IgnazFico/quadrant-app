# Quadrant: Closed Beta Tester Playbook

> **"Doing more is not the same as living well."**  
> Welcome to the private beta test of **Quadrant** — an anti-burnout life architecture web app built to replace toxic streak resets with cumulative annual growth rings and role-based planning.

---

## 1. Quick Start

| Parameter | Details |
| :--- | :--- |
| **Live Production URL** | [https://quadrant-app.vercel.app](https://quadrant-app.vercel.app) |
| **PWA Installable** | Yes (iOS Safari, Android Chrome, Desktop Chrome/Edge) |
| **Architecture** | 100% Zero-Knowledge Client-Side Encryption (Libsodium Sumo) |
| **Support & Feedback Channel** | In-app **Beta Feedback** on Profile tab, or email `support@quadrant.me` |

---

## 2. Installing Quadrant as a Native PWA

Quadrant is designed as a standalone mobile application that works seamlessly offline-first in your hand without app store friction:

### iOS (Safari)
1. Navigate to [`https://quadrant-app.vercel.app`](https://quadrant-app.vercel.app) in **Safari**.
2. Tap the **Share** button (the box with an upward arrow at the bottom of the screen).
3. Scroll down and select **"Add to Home Screen"**.
4. Confirm the name as **Quadrant** and tap **Add**.
5. Launch Quadrant from your home screen — it will open as a standalone app with native safe-area padding and zero browser toolbars.

### Android (Chrome)
1. Open [`https://quadrant-app.vercel.app`](https://quadrant-app.vercel.app) in **Chrome**.
2. Tap the three-dot menu icon in the top right.
3. Select **"Install app"** or **"Add to Home Screen"**.
4. Launch Quadrant directly from your app drawer.

---

## 3. The Zero-Knowledge Guarantee: Critical Note on Passwords & Recovery Codes

Unlike typical SaaS trackers that store your entries in plaintext or use server-side reversible keys, Quadrant employs **true zero-knowledge cryptography**:

* **Argon2id + XSalsa20-Poly1305**: All encryption and key derivation happens locally in your browser memory via WebAssembly (`libsodium`).
* **The Server Only Sees Ciphertext**: The database administrators and hosting infrastructure cannot read your mission statements, weekly reflections, or private life goals.
* ⚠️ **Save Your Recovery Code**: When you create your account, you will receive a 49-character Recovery Code (e.g. `XXXX-XXXX-XXXX-...`). **Copy or store this in a password manager.** Because Quadrant never knows your master key, there is **no backdoor "reset password"** that can decrypt your private notes without either your password or this recovery code.

---

## 4. The Anti-Burnout Philosophy & Core Workflows

Traditional productivity apps glorify 100-day streaks and punish human illness, vacation, or emergencies by resetting your progress to zero. Quadrant replaces this toxic cycle with Stephen Covey’s Quadrant II (*Important, Not Urgent*) methodology:

### Step 1: Claim Your Core Life Roles (Onboarding)
Choose 3 to 5 identity roles that represent your real life (e.g., *Software Architect*, *Runner/Athlete*, *Partner & Friend*, *Continuous Learner*).

### Step 2: Set Weekly Big Rocks (`/goals`)
At the start of your week, define 1–2 essential goals for each role. These are your "Big Rocks" — the actions that compound long-term fulfillment if protected before urgent fires take over.

### Step 3: Schedule Before the Fires Hit (`/schedule`)
Allocate time blocks or priority slots for your Big Rocks into your weekly calendar grid.

### Step 4: Annual Growth Rings (Identity Votes)
Every time you complete a goal, you cast a **permanent identity vote** toward that role's cumulative annual growth ring. Missing a day or taking a break **never resets your ring**. At the end of the year, your ring is sealed into your permanent veteran growth record.

### Step 5: The Sunday Reset (`/weekly-review`)
Wrap up your week with an honest, calm review. Reflect on what was completed, intentionally carry forward or cancel incomplete goals with zero guilt, and log your private encrypted reflection.

### Step 6: Day 7 Milestone: The Personal Mission Statement (`/mission`)
After logging 7 active days in Quadrant, you unlock the sacred Personal Mission Statement ritual — a timeless constitution for who you choose to be.

---

## 5. Beta Cohort Testing Checklist

Please test any of the following scenarios and let us know how the experience felt:

- [ ] **Account Creation & Code Reveal**: Sign up, note down your recovery code, and confirm account creation.
- [ ] **PWA Standalone Launch**: Add to Home Screen and verify navigation, keyboard behavior, and visual hierarchy.
- [ ] **Role & Big Rock Definition**: Add your roles and define your weekly goals on `/goals`.
- [ ] **Schedule Drag & Drop / Timed Blocks**: Schedule priorities on `/schedule`.
- [ ] **Calm Notifications**: Check the header notification bell for morning focus and reset reminders.
- [ ] **Feedback Loop**: Open the **Profile** tab, tap **Beta Feedback & Friction Report**, and submit any bug or UX idea directly to the team!

---

## 6. Feedback & Support

We are building Quadrant to bring sanity, presence, and intentional craft back to modern knowledge workers. If you encounter any rough edges or have ideas on how to improve the experience:

- Tap **Beta Feedback & Friction Report** on your Profile page.
- Email the founding team directly at: [`support@quadrant.me`](mailto:support@quadrant.me).

Thank you for being part of the Quadrant pilot cohort!
