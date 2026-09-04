import Link from "next/link";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { EvidenceCards } from "../../components/landing/EvidenceCards";
import { ParadigmComparison } from "../../components/landing/ParadigmComparison";
import { FeatureShowcase } from "../../components/landing/FeatureShowcase";

export default async function HomePage() {
  const session = await auth();
  let userTarget = "/login";

  if (session?.user) {
    const userId = (session.user as any).id as string;
    const roleCount = await prisma.role.count({ where: { userId } });
    userTarget = roleCount === 0 ? "/onboarding/roles" : "/goals";
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FAF7F2] text-[#1F2937] antialiased selection:bg-[#F97316] selection:text-white">
      {/* 
        BOLD, COMFORTABLE AMBIENT GRADIENT CANVAS 
        Zero shapes, grids, or rotating circles. Pure rich, atmospheric gradient layers.
      */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Top Hero Sunrise Gradient: Rich Terracotta & Peach Amber */}
        <div className="animate-gradient-drift absolute -top-[20%] left-1/2 h-[750px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(249,115,22,0.22)_0%,_rgba(253,186,116,0.18)_40%,_rgba(255,237,213,0.12)_65%,_transparent_80%)] blur-[90px]" />

        {/* Mid-Left Sage & Mint Breathing Glow */}
        <div className="animate-gradient-drift-reverse absolute top-[35%] -left-[15%] h-[680px] w-[780px] rounded-full bg-[radial-gradient(circle,_rgba(187,247,208,0.22)_0%,_rgba(220,252,231,0.14)_50%,_transparent_75%)] blur-[100px]" />

        {/* Mid-Right Warm Honey Apricot Gradient */}
        <div className="animate-gradient-drift absolute top-[55%] -right-[15%] h-[720px] w-[820px] rounded-full bg-[radial-gradient(circle,_rgba(253,186,116,0.24)_0%,_rgba(254,240,138,0.16)_50%,_transparent_75%)] blur-[100px]" />

        {/* Bottom CTA Radiant Dawn Glow */}
        <div className="animate-gradient-drift-reverse absolute -bottom-[15%] left-1/2 h-[650px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(249,115,22,0.26)_0%,_rgba(254,215,170,0.20)_45%,_transparent_75%)] blur-[95px]" />
      </div>

      {/* Foreground Content Container */}
      <div className="relative z-10">
        {/* Top Affirmative Banner */}
        <div className="border-b border-[#ECE8DF]/80 bg-[#FFF5EB]/80 px-4 py-2 text-center backdrop-blur-md">
          <p className="font-mono text-xs font-semibold tracking-tight text-[#C2410C]">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#F97316] animate-pulse" />
            PROOF THE CULTURE CAUGHT UP: DOING MORE IS NOT THE SAME AS LIVING
            WELL
          </p>
        </div>

        {/* Sticky Header Navigation */}
        <header className="sticky top-0 z-40 border-b border-[#ECE8DF]/70 bg-[#FAF7F2]/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <div className="grid h-6 w-6 grid-cols-2 grid-rows-2 gap-[2.5px] rounded-[5px] bg-[#FFF0E0] p-1 shadow-xs ring-1 ring-[#F97316]/20">
                <span className="rounded-[1.5px] bg-[#E5E7EB]" />
                <span className="rounded-[1.5px] bg-[#F97316]" />
                <span className="rounded-[1.5px] bg-[#E5E7EB]" />
                <span className="rounded-[1.5px] bg-[#E5E7EB]" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-[#1F2937]">
                Quadrant
              </span>
            </Link>

            <nav className="flex items-center gap-3 sm:gap-5">
              <Link
                href="#evidence"
                className="hidden font-sans text-xs font-semibold uppercase tracking-wider text-[#6B7280] transition hover:text-[#1F2937] sm:block"
              >
                The Evidence
              </Link>
              <Link
                href="#paradigm"
                className="hidden font-sans text-xs font-semibold uppercase tracking-wider text-[#6B7280] transition hover:text-[#1F2937] sm:block"
              >
                The Paradigm
              </Link>
              <Link
                href="#features"
                className="hidden font-sans text-xs font-semibold uppercase tracking-wider text-[#6B7280] transition hover:text-[#1F2937] sm:block"
              >
                The Architecture
              </Link>

              {session?.user ? (
                <Link
                  href={userTarget}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/20 transition-all hover:bg-[#EA6A0C] hover:shadow-lg hover:shadow-orange-500/30"
                >
                  <span>Enter App</span>
                  <span className="font-mono text-sm">&rarr;</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="font-sans text-xs font-bold uppercase tracking-wider text-[#4B5563] transition hover:text-[#1F2937]"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1F2937] px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-black hover:shadow-lg"
                  >
                    <span>Get Started</span>
                    <span className="font-mono text-sm">&rarr;</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* 
          HERO SECTION WITH FIRST-RENDER ENTRANCE ANIMATIONS
        */}
        <section className="relative px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-5xl text-center">
            {/* Animated Eyebrow Badge */}
            <div className="animate-eyebrow inline-flex items-center gap-2 rounded-full border border-[#FED7AA] bg-[#FFF7ED]/90 px-4 py-1.5 shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C] animate-ping" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#EA580C]">
                Anti-Burnout Life Architecture
              </span>
            </div>

            {/* Main Headline with First-Render Entrance */}
            <h1 className="animate-headline mt-7 font-serif text-4xl font-extrabold leading-[1.08] tracking-tight text-[#1F2937] sm:text-6xl md:text-7xl lg:text-8xl">
              Doing more is not the same as{" "}
              <span className="relative inline-block text-[#F97316]">
                <span className="italic">living well.</span>
                <svg
                  className="absolute -bottom-2 left-0 h-2.5 w-full sm:-bottom-3 sm:h-3.5"
                  viewBox="0 0 260 14"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M 3 10 C 70 3, 190 3, 257 10"
                    stroke="#F97316"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeOpacity="0.75"
                  />
                </svg>
              </span>
            </h1>

            {/* Welcoming Subheadline */}
            <p className="animate-subheadline mx-auto mt-8 max-w-3xl font-sans text-lg font-medium leading-relaxed text-[#4B5563] sm:text-xl md:text-2xl">
              The culture spent a decade glorifying 14-hour hustle streaks and
              50-task to-do lists. Now the science and the boardroom agree:{" "}
              <strong className="font-semibold text-[#1F2937]">
                chronic urgency isn’t ambition—it’s just bad life design.
              </strong>
            </p>

            <p className="animate-subheadline mx-auto mt-3.5 max-w-2xl font-sans text-sm leading-relaxed text-[#6B7280] sm:text-base">
              Quadrant organizes your week by human identity roles, protects
              your Quadrant II priorities before reactive fires hit, and
              replaces broken streak guilt with cumulative annual growth rings.
            </p>

            {/* Action CTAs */}
            <div className="animate-cta-fade mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href={session?.user ? userTarget : "/login"}
                className="w-full rounded-xl bg-[#F97316] px-8 py-4 font-sans text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:bg-[#EA6A0C] hover:shadow-2xl hover:shadow-orange-500/35 hover:-translate-y-0.5 sm:w-auto"
              >
                {session?.user
                  ? "Go To Your Dashboard"
                  : "Design Your Week Free"}
              </Link>
              <Link
                href="#evidence"
                className="w-full rounded-xl border border-[#D1D5DB]/90 bg-white/80 px-8 py-4 font-sans text-base font-semibold text-[#374151] shadow-xs backdrop-blur-md transition-all hover:border-[#9CA3AF] hover:bg-white hover:-translate-y-0.5 sm:w-auto"
              >
                See The Evidence &rarr;
              </Link>
            </div>

            <div className="animate-cta-fade mt-5 flex items-center justify-center gap-4 font-mono text-[11px] text-[#9CA3AF]">
              <span>🔒 Zero-Knowledge Encrypted</span>
              <span>&bull;</span>
              <span>🚫 Zero Streak Penalties</span>
              <span>&bull;</span>
              <span>🌿 100% Free to Begin</span>
            </div>
          </div>
        </section>

        {/* 
          BITE-SIZED EVIDENCE SECTION WITH 3D FLIP CARDS
        */}
        <section
          id="evidence"
          className="relative border-y border-[#ECE8DF]/80 bg-[#FAF7F2]/60 px-5 py-20 backdrop-blur-sm sm:px-8 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-md bg-[#FFF0E0] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
                Cultural Proof
              </div>
              <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#1F2937] sm:text-5xl">
                The world caught up to what Quadrant was built on.
              </h2>
              <p className="mt-3 font-sans text-base font-medium text-[#6B7280] sm:text-lg">
                You aren’t lazy. You were given tools designed to manage factory
                widgets instead of multi-dimensional human lives.{" "}
                <span className="font-semibold text-[#1F2937]">
                  Hover or tap any card to reveal the evidence behind the stat:
                </span>
              </p>
            </div>

            {/* Interactive 3D Flip Cards Component */}
            <EvidenceCards />
          </div>
        </section>

        {/* 
          THE PARADIGM CONTRAST: CRUMBLING FRACTURED SYSTEM VS. INTERLOCKING ARCHITECTURE
        */}
        <section id="paradigm" className="relative px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F97316]">
                A Fundamentally Different Model
              </span>
              <h2 className="mt-3 font-serif text-3xl font-extrabold tracking-tight text-[#1F2937] sm:text-5xl">
                Stop playing calendar Tetris.
              </h2>
              <p className="mx-auto mt-3 max-w-2xl font-sans text-base text-[#6B7280] sm:text-lg">
                Notice the difference between managing tasks and designing a
                life.
              </p>
            </div>

            {/* Redesigned Paradigm Comparison (Broken/Crumbling vs. Interlocking Architecture) */}
            <ParadigmComparison />
          </div>
        </section>

        {/* 
          FEATURE SHOWCASE: FOCUS 100% ON HIGHLIGHTING THE EXAMPLE
        */}
        <section
          id="features"
          className="relative border-t border-[#ECE8DF]/80 bg-[#FAF7F2]/70 px-5 py-20 backdrop-blur-sm sm:px-8 sm:py-28"
        >
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F97316]">
                Inside The App
              </span>
              <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl md:text-5xl">
                An interface designed to keep you centered.
              </h2>
              <p className="mt-2 text-sm text-[#6B7280]">
                Explore the interactive examples below to see how Quadrant works
                in real practice.
              </p>
            </div>

            {/* Interactive Feature Showcase Focusing Entirely on the Feature Examples */}
            <FeatureShowcase />
          </div>
        </section>

        {/* 
          FINAL BOLD AFFIRMATION & CALL TO ACTION
        */}
        <section className="relative overflow-hidden border-t border-[#ECE8DF]/80 bg-gradient-to-b from-[#FAF7F2] to-[#FFF5EB] px-5 py-24 text-center sm:px-8 sm:py-32">
          <div className="mx-auto max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FED7AA] bg-white/90 px-3.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-[#EA580C] shadow-xs backdrop-blur-md">
              Take Back Your Mind
            </div>

            <h2 className="mt-6 font-serif text-3xl font-black leading-tight tracking-tight text-[#1F2937] sm:text-5xl md:text-6xl">
              You don&apos;t need another to-do list.
              <br />
              <span className="text-[#F97316]">
                You need a life architecture.
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-2xl font-sans text-base leading-relaxed text-[#4B5563] sm:text-lg">
              Stop waiting for Friday to finally feel like a human being. Start
              your week by deciding who you are, what matters, and where your
              real energy belongs.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={session?.user ? userTarget : "/login"}
                className="w-full rounded-xl bg-[#F97316] px-8 py-4 font-sans text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:bg-[#EA6A0C] hover:shadow-2xl hover:shadow-orange-500/35 hover:-translate-y-0.5 sm:w-auto"
              >
                {session?.user
                  ? "Enter Your Dashboard &rarr;"
                  : "Start Your Growth Rings Free &rarr;"}
              </Link>
            </div>

            <p className="mt-4 font-mono text-xs text-[#9CA3AF]">
              Zero credit card required &bull; Client-side encrypted &bull;
              Built for humans
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#ECE8DF]/80 bg-[#FAF7F2]/90 px-5 py-10 text-xs text-[#9CA3AF] backdrop-blur-md sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="grid h-4 w-4 grid-cols-2 grid-rows-2 gap-[2px]">
                <span className="rounded-[1px] bg-[#E5E7EB]" />
                <span className="rounded-[1px] bg-[#F97316]" />
                <span className="rounded-[1px] bg-[#E5E7EB]" />
                <span className="rounded-[1px] bg-[#E5E7EB]" />
              </div>
              <span className="font-serif font-bold text-[#374151]">
                Quadrant
              </span>
              <span>&bull;</span>
              <span>Doing more isn&apos;t the same as living well.</span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/login" className="hover:text-[#1F2937]">
                Log In
              </Link>
              <Link href="/login" className="hover:text-[#1F2937]">
                Create Account
              </Link>
              <Link href="#evidence" className="hover:text-[#1F2937]">
                Citations & Data
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
