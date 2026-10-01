"use client";

/**
 * The ceremony's content, scene by scene. Ported from
 * web-prototype/year-review.js buildScenes().
 *
 * Rules the copy follows (do not reintroduce):
 *  - measure showing up, never success rate: no completion %, no "of N set"
 *  - no role rankings (most improved / quietest...), roles appear in the user's own order
 *  - no "due attention" homework, no plan-vs-actual audit of the mission statement
 *  - no "only" / comparisons to a target
 *  - never quote ReviewEntry reasons (they exist only for missed goals)
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import { domainColor } from "../../../lib/domainColors";
import type { YearReview } from "../../../hooks/useYearReview";
import { RoleStars, TogetherSky, yearRingCloseMs } from "./CeremonyRings";

export type SceneDef = {
  id: string;
  node: ReactNode;
  /** colours the background light while this scene is showing */
  tint?: string;
  /** closing scene: back matter scrolls, embers burst when the year ring closes */
  final?: boolean;
  /** ms between lines (default 1100) */
  stagger?: number;
  /** ms after the scene starts revealing to release an ember burst */
  burstAt?: number;
};

const DOMAIN_LABEL: Record<string, string> = {
  career: "Career",
  family: "Family",
  growth: "Mind & growth",
  health: "Health & body",
  relationships: "Relationships",
  community: "Community",
  values: "Spiritual & values",
};

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Part = string | { em: string };

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" });
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long" });

// ---------- building blocks ----------

/** Words wrapped individually so a headline arrives word by word. */
function Words({ parts }: { parts: Part[] }) {
  let i = 0;
  const words = (text: string, keyPrefix: string) =>
    text.split(/(\s+)/).map((w, j) =>
      w.trim() ? (
        <span key={`${keyPrefix}-${j}`} className="yc-w" style={{ "--i": i++ } as Vars}>
          {w}
        </span>
      ) : (
        w
      ),
    );
  return (
    <>
      {parts.map((p, k) =>
        typeof p === "string" ? words(p, `t${k}`) : <em key={`e${k}`}>{words(p.em, `e${k}`)}</em>,
      )}
    </>
  );
}

function Line({
  children,
  className = "",
  pause,
}: {
  children: ReactNode;
  className?: string;
  pause?: number;
}) {
  return (
    <div className={`yc-line ${className}`} data-pause={pause}>
      {children}
    </div>
  );
}

function Lead({ parts, pause }: { parts: Part[]; pause?: number }) {
  return (
    <h1 className="yc-line yc-lead yc-split" tabIndex={-1} data-pause={pause}>
      <Words parts={parts} />
    </h1>
  );
}

function Soft({ children, strong, pause }: { children: ReactNode; strong?: boolean; pause?: number }) {
  return (
    <p className={`yc-line yc-soft ${strong ? "yc-strong" : ""}`} data-pause={pause}>
      {children}
    </p>
  );
}

function Kicker({ children, dot }: { children: ReactNode; dot?: string }) {
  return (
    <Line className="yc-kicker-line">
      <span className="yc-kicker">
        {dot && <span className="yc-kdot" style={{ background: dot }} />}
        <span>{children}</span>
      </span>
    </Line>
  );
}

const Num = ({ n }: { n: number }) => <span className="yc-num">{n}</span>;

/** "once" / "{n} times" */
function Times({ n, capital }: { n: number; capital?: boolean }) {
  if (n === 1) return <>{capital ? "Once" : "once"}</>;
  return (
    <>
      <Num n={n} /> times
    </>
  );
}

/** Counts up from zero when revealed. The engine owns the text (see YearCeremony countUp). */
function Figure({ n }: { n: number }) {
  return (
    <Line className="yc-figure-line">
      <div className="yc-figure" data-count={n} aria-label={String(n)} />
    </Line>
  );
}

function Slip({
  text,
  date,
  sign,
  tilt,
  pause,
}: {
  text: string;
  date?: string;
  sign?: string;
  tilt?: boolean;
  pause?: number;
}) {
  return (
    <Line pause={pause}>
      <figure className={`yc-slip ${tilt ? "yc-tilt-r" : ""}`}>
        {date && <p className="yc-slip-date">{date}</p>}
        <blockquote className="yc-slip-text">{text}</blockquote>
        {sign && <span className="yc-signature">{sign}</span>}
      </figure>
    </Line>
  );
}

function Mark() {
  return (
    <span className="yc-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function BackMatter({ data }: { data: YearReview }) {
  const [cardOpen, setCardOpen] = useState(false);
  const m = data.momentum;
  const rows: [string, string | number][] = [
    ["Goals completed", m.completedGoals],
    ["Goals set", m.totalGoals],
    ...(m.busiestMonth ? [["Busiest month", m.busiestMonth] as [string, string]] : []),
    ["Days in Quadrant", m.activeDays],
  ];
  return (
    <>
      <details>
        <summary>The numbers, if you want them</summary>
        <dl className="yc-numbers">
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </details>
      <button
        type="button"
        className="yc-card-toggle"
        aria-expanded={cardOpen}
        aria-controls="yc-share-card"
        onClick={() => setCardOpen((o) => !o)}
      >
        Keep a card of this year
      </button>
      <div id="yc-share-card" hidden={!cardOpen}>
        <div className="yc-share-card">
          <TogetherSky rings={data.rings} variant="card" trackStroke="rgba(255,255,255,0.22)" />
          <div className="yc-share-name">{data.identity.title ?? "The year I began"}</div>
          <div className="yc-share-year">{data.year} &middot; Quadrant</div>
        </div>
      </div>
    </>
  );
}

// ---------- the ceremony ----------

export function buildScenes(d: YearReview, statementSnippet: string | null): SceneDef[] {
  const scenes: SceneDef[] = [];
  const add = (id: string, node: ReactNode, opts: Omit<SceneDef, "id" | "node"> = {}) =>
    scenes.push({ id, node, ...opts });
  const m = d.momentum;
  const roles = d.rings;

  // 0. Threshold
  add(
    "threshold",
    <>
      <Line>
        <Mark />
      </Line>
      <Kicker>Your year in Quadrant</Kicker>
      <Line>
        <div className="yc-year-mark">{d.year}</div>
      </Line>
      <Lead parts={["Before anything else, ", { em: "thank you." }]} pause={300} />
      <Soft pause={700}>
        This year, you kept making time for yourself.
        <br />
        Let&rsquo;s look at what that added up to.
      </Soft>
      <Line className="yc-btn-row" pause={500}>
        <button type="button" className="yc-btn yc-btn-begin" data-action="next">
          Begin
        </button>
      </Line>
    </>,
  );

  // 1. You showed up
  {
    const one = m.activeDays === 1;
    add(
      "showed-up",
      <>
        <Kicker>You showed up</Kicker>
        <Figure n={m.activeDays} />
        <Lead parts={[`${one ? "day" : "days"} you came back `, { em: "to yourself." }]} pause={700} />
        {m.activeDays < 7 ? (
          <Soft pause={300}>{one ? "It was" : "Each one was"} a choice you made for yourself.</Soft>
        ) : (
          <Soft pause={300}>
            Not in a row. Not perfectly.
            <br />
            Just again, and again.
          </Soft>
        )}
        {m.weeksPlanned > 0 && (
          <Soft strong pause={1400}>
            And <Times n={m.weeksPlanned} />, you sat down
            <br />
            and planned a week of your life on purpose.
          </Soft>
        )}
      </>,
    );
  }

  // 2. Where it started
  if (m.firstCompleted) {
    add(
      "first",
      <>
        <Kicker>Where it started</Kicker>
        <Lead parts={["It started with ", { em: "this." }]} />
        <Slip text={m.firstCompleted.title} date={fmtDay(m.firstCompleted.date)} pause={500} />
        <Soft pause={1200}>Everything after grew from here.</Soft>
      </>,
    );
  }

  // 3. Roles: one screen each, or one quiet grid past 5 roles
  if (roles.length > 0 && roles.length <= 5) {
    for (const r of roles) {
      const color = domainColor(r.domain);
      add(
        `role-${r.roleId}`,
        <>
          <Kicker dot={color}>{DOMAIN_LABEL[r.domain] ?? r.domain}</Kicker>
          <h1 className="yc-line yc-role-name yc-split" tabIndex={-1}>
            <Words parts={[r.label]} />
          </h1>
          <Line pause={200}>
            <RoleStars months={r.months} peak={r.peak} votes={r.votesLogged} domain={r.domain} />
          </Line>
          {r.votesLogged > 0 ? (
            <Soft pause={Math.min(2000, r.votesLogged * 50)}>
              You showed up for this part of your life
              <br />
              <Times n={r.votesLogged} /> this year.
            </Soft>
          ) : (
            <Soft pause={600}>
              This one rested this year.
              <br />
              It&rsquo;s still part of you.
            </Soft>
          )}
          {r.newThisYear && (
            <Line pause={300}>
              <span className="yc-role-new">
                {r.votesLogged > 0
                  ? "New this year. You made room for it."
                  : "New this year. There\u2019s room for it now."}
              </span>
            </Line>
          )}
        </>,
        { tint: color },
      );
    }
  } else if (roles.length > 5) {
    add(
      "roles-grid",
      <>
        <Kicker>Your roles</Kicker>
        <Lead parts={["Every part of your life, ", { em: "this year." }]} />
        <div className="yc-role-grid">
          {roles.map((r) => (
            <Line key={r.roleId} className="yc-role-cell">
              <RoleStars months={r.months} peak={r.peak} votes={r.votesLogged} domain={r.domain} variant="mini" />
              <div className="yc-cell-name">{r.label}</div>
              <div className="yc-cell-sub">
                {r.votesLogged > 0
                  ? `Showed up ${r.votesLogged === 1 ? "once" : `${r.votesLogged} times`}`
                  : "Rested this year"}
              </div>
              {r.newThisYear && <div className="yc-cell-new">New this year</div>}
            </Line>
          ))}
        </div>
      </>,
      { stagger: 450 },
    );
  }

  if (roles.length > 0) {
    add(
      "together",
      <>
        <Line>
          <TogetherSky rings={roles} />
        </Line>
        <Lead parts={["All of you, ", { em: "in one year." }]} pause={roles.length * 260 + 600} />
      </>,
    );
  }

  // 4. The honest moments
  const it = d.integrity;
  if (it.reflectedCount > 0) {
    add(
      "honest",
      <>
        <Kicker>The honest moments</Kicker>
        <Lead parts={["Not everything went ", { em: "to plan." }]} />
        <Soft pause={400}>
          <Times n={it.reflectedCount} capital />, something didn&rsquo;t happen,
          <br />
          and instead of looking away, you asked yourself why.
        </Soft>
        <Soft strong pause={1200}>
          That takes more than finishing things does.
        </Soft>
        {(it.carriedCount > 0 || it.cancelledCount > 0) && (
          <Soft pause={1600}>
            {it.carriedCount > 0 && (
              <>
                {it.carriedCount === 1 ? "One" : <Num n={it.carriedCount} />} you chose again.
              </>
            )}
            {it.carriedCount > 0 && it.cancelledCount > 0 && <br />}
            {it.cancelledCount > 0 && (
              <>
                {it.cancelledCount === 1 ? "One" : <Num n={it.cancelledCount} />} you let go.
                <br />
                Letting go is a decision too.
              </>
            )}
          </Soft>
        )}
      </>,
    );
  }

  // 5. The words you wrote (only when the statement decrypted this session)
  if (d.missionStatement && statementSnippet) {
    add(
      "words",
      <>
        <Kicker>Your own words</Kicker>
        <Slip
          text={statementSnippet}
          date={`Written in ${fmtMonth(d.missionStatement.signedAt)}`}
          sign={d.missionStatement.signedName}
          tilt
          pause={300}
        />
        <Soft pause={2200}>
          You didn&rsquo;t need to live them perfectly.
          <br />
          You just kept coming back to them.
        </Soft>
      </>,
    );
  }

  // 6. If this year had a name
  if (d.identity.title) {
    add(
      "name",
      <>
        <Kicker>If this year had a name</Kicker>
        <p className="yc-line yc-year-name yc-split" data-pause={500}>
          <Words parts={[d.identity.title]} />
        </p>
        <p className="yc-line yc-quiet" data-pause={1100}>
          Taken from where your time actually went.
        </p>
      </>,
    );
  } else {
    add(
      "name",
      <>
        <Kicker>This year didn&rsquo;t need a name</Kicker>
        <p className="yc-line yc-year-name yc-split" data-pause={500}>
          <Words parts={["It was the one where you began."]} />
        </p>
      </>,
    );
  }

  // 7. Closing the year
  add(
    "close",
    <>
      <Line>
        <TogetherSky rings={roles} yearRing />
      </Line>
      <Lead
        parts={[`${d.year} is `, { em: "part of you" }, " now."]}
        pause={roles.length * 260 + 3600}
      />
      <Soft pause={600}>
        This ring is permanent.
        <br />
        Nothing next year can undo it.
      </Soft>
      <p className="yc-line yc-closing" data-pause={1400}>
        Thank you for making time for yourself.
      </p>
      <Line className="yc-btn-row" pause={700}>
        <button type="button" className="yc-btn yc-btn-close" data-action="close">
          Close the year
        </button>
      </Line>
      <Line className="yc-back-matter" pause={900}>
        <BackMatter data={d} />
      </Line>
    </>,
    // First line reveals at 450ms; the year ring then takes yearRingCloseMs to close.
    { final: true, burstAt: 450 + yearRingCloseMs(roles.length) },
  );

  return scenes;
}
