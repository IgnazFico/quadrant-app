import Link from "next/link";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export default async function HomePage() {
  const session = await auth();
  let userTarget = "/login";

  if (session?.user) {
    const userId = (session.user as any).id as string;
    const roleCount = await prisma.role.count({ where: { userId } });
    userTarget = roleCount === 0 ? "/onboarding/roles" : "/goals";
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#1F2937] antialiased selection:bg-[#F97316] selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#ECE8DF] bg-[#FFFDF9]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-5 w-5 grid-cols-2 grid-rows-2 gap-[2px]">
              <span className="rounded-[2px] bg-[#E5E7EB]" />
              <span className="rounded-[2px] bg-[#F97316]" />
              <span className="rounded-[2px] bg-[#E5E7EB]" />
              <span className="rounded-[2px] bg-[#E5E7EB]" />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight text-[#1F2937]">
              Quadrant
            </span>
          </div>

          <nav className="flex items-center gap-4">
            {session?.user ? (
              <Link
                href={userTarget}
                className="rounded-xl bg-[#F97316] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#EA6A0C]"
              >
                Go to App &rarr;
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-[#6B7280] transition hover:text-[#1F2937]"
                >
                  Log in
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl bg-[#1F2937] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-3.5 py-1 text-xs font-semibold text-[#92400E]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
            Quadrant II Life Design for Students & Early Professionals
          </div>

          <h1 className="mt-6 font-serif text-4xl font-semibold tracking-tight text-[#1F2937] sm:text-6xl sm:leading-[1.15]">
            You are more than a to-do list.{" "}
            <span className="italic text-[#F97316]">Design your week by roles.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#6B7280] sm:text-lg">
            Ditch toxic streak resets and reactive calendars. Quadrant helps you balance
            academics, career trajectory, fitness, relationships, and self-growth with
            privacy-first, zero-knowledge encryption.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={session?.user ? userTarget : "/login"}
              className="w-full rounded-xl bg-[#F97316] px-6 py-3.5 text-center text-sm font-semibold text-white shadow-md transition hover:bg-[#EA6A0C] sm:w-auto"
            >
              {session?.user ? "Enter Your Dashboard" : "Start Setting Weekly Big Rocks"}
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-[#ECE8DF] bg-white px-6 py-3.5 text-center text-sm font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F9FAFB] sm:w-auto"
            >
              Learn the Paradigm
            </Link>
          </div>

          {/* Interactive Preview Mockup */}
          <div className="mt-14 rounded-2xl border border-[#ECE8DF] bg-white p-4 shadow-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-[#F3F4F6] pb-3 text-left">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-[#9CA3AF]">
                  This Week
                </span>
                <h3 className="font-serif text-base font-semibold text-[#1F2937]">
                  Your Big Rocks by Identity Role
                </h3>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]/60" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-left">
              <div className="rounded-xl border-l-4 border-[#3B82F6] bg-[#F8FAFC] p-3.5">
                <span className="text-xs font-semibold text-[#1E40AF]">Career & Scholar</span>
                <p className="mt-1 text-sm font-medium text-[#1E293B]">
                  Finish Operating Systems Lab 4
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#64748B]">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] text-blue-700">
                    Quad II
                  </span>
                  <span>Tue / Thu Focus</span>
                </div>
              </div>

              <div className="rounded-xl border-l-4 border-[#10B981] bg-[#F0FDF4] p-3.5">
                <span className="text-xs font-semibold text-[#065F46]">Fitness & Health</span>
                <p className="mt-1 text-sm font-medium text-[#064E3B]">
                  3x Zone-2 Runs + Meal Prep
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#047857]">
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700">
                    Growth Ring
                  </span>
                  <span>Cumulative</span>
                </div>
              </div>

              <div className="rounded-xl border-l-4 border-[#F97316] bg-[#FFF7ED] p-3.5">
                <span className="text-xs font-semibold text-[#9A3412]">Friend & Sibling</span>
                <p className="mt-1 text-sm font-medium text-[#7C2D12]">
                  Sunday dinner with family
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#C2410C]">
                  <span className="rounded bg-orange-100 px-1.5 py-0.5 font-mono text-[10px] text-orange-700">
                    Identity
                  </span>
                  <span>Relationship</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="border-t border-[#ECE8DF] bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-semibold text-[#1F2937]">
              Built differently from typical productivity tools
            </h2>
            <p className="mt-3 text-[#6B7280]">
              Designed around intentionality, cumulative tenure, and mental peace.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#ECE8DF] bg-[#FFFDF9] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1E4] text-[#F97316]">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
                </svg>
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-[#1F2937]">
                Annual Growth Rings
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                No streaks to lose. Each finished goal adds cumulative votes to your role’s yearly growth rings. At year-end, rings seal permanently into your veteran identity record.
              </p>
            </div>

            <div className="rounded-2xl border border-[#ECE8DF] bg-[#FFFDF9] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#3B82F6]">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                </svg>
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-[#1F2937]">
                Weekly Big Rocks & Scheduling
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                Plan what is important before what is urgent. Schedule priority blocks, integrate flexible goals, and review carryovers weekly without guilt or judgment.
              </p>
            </div>

            <div className="rounded-2xl border border-[#ECE8DF] bg-[#FFFDF9] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#10B981]">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-[#1F2937]">
                Zero-Knowledge Privacy
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                Your personal mission statement and reflections are encrypted in your browser using Libsodium and Argon2id. We never see your plaintext thoughts or personal keys.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ECE8DF] bg-[#FAF8F5] px-6 py-8 text-center text-xs text-[#9CA3AF]">
        <div className="mx-auto max-w-5xl flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-3.5 w-3.5 grid-cols-2 grid-rows-2 gap-[1px]">
              <span className="rounded-[1px] bg-[#E5E7EB]" />
              <span className="rounded-[1px] bg-[#F97316]" />
              <span className="rounded-[1px] bg-[#E5E7EB]" />
              <span className="rounded-[1px] bg-[#E5E7EB]" />
            </div>
            <span className="font-serif font-semibold text-[#4B5563]">Quadrant</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-[#1F2937]">Sign In</Link>
            <Link href="/login" className="hover:text-[#1F2937]">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
