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
    const userId = session.user.id;
    const roleCount = await prisma.role.count({ where: { userId } });
    userTarget = roleCount === 0 ? "/onboarding/roles" : "/goals";
  }

  const jsonLdSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://quadrant.com/#software",
        "name": "Quadrant",
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
        "description":
          "Quadrant is an anti-burnout life architecture application replacing toxic streak resets with cumulative annual growth rings and role-based planning.",
      },
      {
        "@type": "FAQPage",
        "@id": "https://quadrant.com/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does Quadrant eliminate habit streak guilt?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Quadrant replaces fragile streaks with Cumulative Annual Growth Rings. When you complete a goal, you log a permanent vote toward your role's annual ring. Missing a day never resets your progress to zero.",
            },
          },
          {
            "@type": "Question",
            "name": "What is the Quadrant II planning method?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Rooted in Stephen Covey's time management matrix, Quadrant II focuses on tasks that are highly important but not urgent (health, relationships, craft). Quadrant schedules these Big Rocks before reactive urgent fires crowd the day.",
            },
          },
          {
            "@type": "Question",
            "name": "Is Quadrant end-to-end encrypted?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. Quadrant utilizes zero-knowledge client-side encryption via Libsodium and Argon2id key derivation. Your goals and reflections are encrypted in your browser before saving.",
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="landing-ambient-canvas relative min-h-screen overflow-x-hidden text-[#1F2937] antialiased selection:bg-[#F97316] selection:text-white">
      {/* Machine-Readable JSON-LD Schema for Answer Engine Optimization (AEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />

      {/* Top Affirmative Banner */}
      <div className="border-b border-[#ECE8DF]/80 bg-[#FFF5EB]/80 px-4 py-2 text-center backdrop-blur-xs">
        <p className="font-mono text-xs font-semibold tracking-tight text-[#C2410C]">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#F97316] animate-pulse" />
          PROOF THE CULTURE CAUGHT UP: DOING MORE IS NOT THE SAME AS LIVING WELL
        </p>
      </div>

      {/* Sticky Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#ECE8DF]/70 bg-[#FAF7F2]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
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

      {/* Hero Section with GPU-Accelerated First-Render Entrance */}
      <section className="relative px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="mx-auto max-w-5xl text-center">
          {/* Eyebrow Badge */}
          <div className="animate-eyebrow inline-flex items-center gap-2 rounded-full border border-[#FED7AA] bg-[#FFF7ED]/90 px-4 py-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C] animate-ping" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#EA580C]">
              Anti-Burnout Life Architecture
            </span>
          </div>

          {/* Main Headline */}
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
            The culture spent a decade glorifying 14-hour hustle streaks and 50-task to-do lists.
            Now the science and the boardroom agree:{" "}
            <strong className="font-semibold text-[#1F2937]">
              chronic urgency isn’t ambition—it’s just bad life design.
            </strong>
          </p>

          <p className="animate-subheadline mx-auto mt-3.5 max-w-2xl font-sans text-sm leading-relaxed text-[#6B7280] sm:text-base">
            Quadrant organizes your week by human identity roles, protects your Quadrant II priorities before reactive fires hit, and replaces broken streak guilt with cumulative annual growth rings.
          </p>

          {/* Action CTAs */}
          <div className="animate-cta-fade mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Link
              href={session?.user ? userTarget : "/login"}
              className="w-full rounded-xl bg-[#F97316] px-8 py-4 font-sans text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:bg-[#EA6A0C] hover:shadow-2xl hover:shadow-orange-500/35 hover:-translate-y-0.5 sm:w-auto"
            >
              {session?.user ? "Go To Your Dashboard" : "Design Your Week Free"}
            </Link>
            <Link
              href="#evidence"
              className="w-full rounded-xl border border-[#D1D5DB]/90 bg-white/90 px-8 py-4 font-sans text-base font-semibold text-[#374151] shadow-xs transition-all hover:border-[#9CA3AF] hover:bg-white hover:-translate-y-0.5 sm:w-auto"
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

      {/* Bite-Sized Evidence Section with Interactive 3D Flip Cards */}
      <section id="evidence" className="relative border-y border-[#ECE8DF]/80 bg-white/40 px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md bg-[#FFF0E0] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
              Cultural Proof
            </div>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#1F2937] sm:text-5xl">
              The world caught up to what Quadrant was built on.
            </h2>
            <p className="mt-3 font-sans text-base font-medium text-[#6B7280] sm:text-lg">
              You aren’t lazy. You were given tools designed to manage factory widgets instead of multi-dimensional human lives.{" "}
              <span className="font-semibold text-[#1F2937]">Hover or tap any card to reveal the evidence behind the stat:</span>
            </p>
          </div>

          {/* Interactive 3D Flip Cards */}
          <EvidenceCards />
        </div>
      </section>

      {/* The Paradigm Contrast: Crumbling Fractured System vs. Interlocking Architecture */}
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
              Notice the difference between managing tasks and designing a life.
            </p>
          </div>

          {/* Redesigned Paradigm Comparison */}
          <ParadigmComparison />
        </div>
      </section>

      {/* Feature Showcase: Highlighting the Feature Examples Directly */}
      <section id="features" className="relative border-t border-[#ECE8DF]/80 bg-white/50 px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F97316]">
              Inside The App
            </span>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl md:text-5xl">
              An interface designed to keep you centered.
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Explore the interactive examples below to see how Quadrant works in real practice.
            </p>
          </div>

          {/* Interactive Feature Showcase */}
          <FeatureShowcase />
        </div>
      </section>

      {/* Final Bold Affirmation & Call to Action */}
      <section className="relative overflow-hidden border-t border-[#ECE8DF]/80 bg-gradient-to-b from-transparent to-[#FFF5EB]/70 px-5 py-24 text-center sm:px-8 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FED7AA] bg-white/90 px-3.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-[#EA580C] shadow-xs">
            Take Back Your Mind
          </div>

          <h2 className="mt-6 font-serif text-3xl font-black leading-tight tracking-tight text-[#1F2937] sm:text-5xl md:text-6xl">
            You don&apos;t need another to-do list.
            <br />
            <span className="text-[#F97316]">You need a life architecture.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl font-sans text-base leading-relaxed text-[#4B5563] sm:text-lg">
            Stop waiting for Friday to finally feel like a human being. Start your week by deciding who you are, what matters, and where your real energy belongs.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={session?.user ? userTarget : "/login"}
              className="w-full rounded-xl bg-[#F97316] px-8 py-4 font-sans text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:bg-[#EA6A0C] hover:shadow-2xl hover:shadow-orange-500/35 hover:-translate-y-0.5 sm:w-auto"
            >
              {session?.user ? "Enter Your Dashboard &rarr;" : "Start Your Growth Rings Free &rarr;"}
            </Link>
          </div>

          <p className="mt-4 font-mono text-xs text-[#9CA3AF]">
            Zero credit card required &bull; Client-side encrypted &bull; Built for humans
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ECE8DF]/80 bg-[#FAF7F2]/90 px-5 py-10 text-xs text-[#9CA3AF] sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="grid h-4 w-4 grid-cols-2 grid-rows-2 gap-[2px]">
              <span className="rounded-[1px] bg-[#E5E7EB]" />
              <span className="rounded-[1px] bg-[#F97316]" />
              <span className="rounded-[1px] bg-[#E5E7EB]" />
              <span className="rounded-[1px] bg-[#E5E7EB]" />
            </div>
            <span className="font-serif font-bold text-[#374151]">Quadrant</span>
            <span>&bull;</span>
            <span>Doing more isn&apos;t the same as living well.</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-[#1F2937]">Log In</Link>
            <Link href="/login" className="hover:text-[#1F2937]">Create Account</Link>
            <Link href="#evidence" className="hover:text-[#1F2937]">Citations & Data</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
