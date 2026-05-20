import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Clock, AlertTriangle, ChevronLeft, Medal } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AWARD_THEME, AWARD_CATEGORIES } from "@/data/awards";
import SiteNav from "@/components/SiteNav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// ─── Scoring window ───────────────────────────────────────────────────────────
const OPEN_DATE = new Date(AWARD_THEME.scoringOpenDate);
const CLOSE_DATE = new Date(AWARD_THEME.scoringDeadline);

function getScoringStatus(): "before" | "open" | "closed" {
  const now = new Date();
  if (now < OPEN_DATE) return "before";
  if (now > CLOSE_DATE) return "closed";
  return "open";
}

// ─── Types ────────────────────────────────────────────────────────────────────
type JudgeScoreDoc = {
  nominationId: string;
  judgeUid: string;
  judgeEmail: string;
  nomineeName: string;
  categoryName: string;
  categoryId?: string;
  score: number; // 0-5
  comment: string;
  updatedAt: { toDate?: () => Date } | null;
};

type NomineeEntry = {
  nominationId: string;
  nomineeName: string;
  categoryId: string;
  categoryName: string;
  scores: number[];
  avgScore: number;
  judgeCount: number;
};

// ─── Route ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
  head: () => ({
    meta: [
      { title: "Leaderboard · SALEA 2026" },
      { name: "description", content: "Per-category judge leaderboard for SALEA 2026." },
    ],
  }),
});

// ─── Stars display (read-only) ─────────────────────────────────────────────── 
function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < Math.round(value)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted-foreground/20"
          }`}
        />
      ))}
    </span>
  );
}

// ─── Rank medal ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-yellow-400 shadow">
        <Trophy className="h-4 w-4 text-white" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-300 shadow">
        <Medal className="h-4 w-4 text-white" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-600 shadow">
        <Medal className="h-4 w-4 text-white" />
      </div>
    );
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/20 bg-muted text-sm font-bold text-muted-foreground">
      {rank}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function LeaderboardPage() {
  const [allScores, setAllScores] = useState<JudgeScoreDoc[]>([]);
  const status = getScoringStatus();

  useEffect(() => {
    const q = query(collection(db, "judge_scores"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setAllScores(snap.docs.map((d) => ({ ...d.data() } as JudgeScoreDoc)));
    });
    return () => unsub();
  }, []);

  // Build per-category ranking
  const categories = useMemo(() => {
    // Map: nominationId → NomineeEntry
    const nomineeMap = new Map<string, NomineeEntry>();

    for (const s of allScores) {
      if (s.score === 0) continue; // skip unscored
      const key = s.nominationId;
      if (!nomineeMap.has(key)) {
        // Try to find the categoryId from AWARD_CATEGORIES by matching name
        const catMatch = AWARD_CATEGORIES.find((c) => c.name === s.categoryName);
        nomineeMap.set(key, {
          nominationId: key,
          nomineeName: s.nomineeName,
          categoryId: s.categoryId ?? catMatch?.id ?? s.categoryName,
          categoryName: s.categoryName,
          scores: [],
          avgScore: 0,
          judgeCount: 0,
        });
      }
      const entry = nomineeMap.get(key)!;
      entry.scores.push(s.score);
      entry.avgScore = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
      entry.judgeCount = entry.scores.length;
    }

    // Group by categoryName → sort by avgScore desc
    const catMap = new Map<string, NomineeEntry[]>();
    for (const entry of nomineeMap.values()) {
      if (!catMap.has(entry.categoryName)) catMap.set(entry.categoryName, []);
      catMap.get(entry.categoryName)!.push(entry);
    }
    for (const arr of catMap.values()) {
      arr.sort((a, b) => b.avgScore - a.avgScore || b.judgeCount - a.judgeCount);
    }

    // Return sorted by known category order first, then alphabetical
    const knownOrder = AWARD_CATEGORIES.map((c) => c.name);
    return Array.from(catMap.entries()).sort(([a], [b]) => {
      const ai = knownOrder.indexOf(a);
      const bi = knownOrder.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [allScores]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-hero">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,oklch(0.90_0.04_260)_0%,transparent_60%)]" />
      <SiteNav />
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-16 pt-28">
        {/* Header */}
        <div className="mb-10">
          <Link
            to="/judge"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Judge Panel
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">SALEA 2026</p>
            <h1 className="mt-1 font-serif text-4xl font-bold sm:text-5xl">
              Judge <span className="text-gradient-gold">Leaderboard</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              Average star ratings across all judges, per category. Updates live as judges submit scores.
            </p>
          </motion.div>
        </div>

        {/* Scoring window status */}
        {status === "before" && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Clock className="h-5 w-5 shrink-0" />
            Scoring opens on{" "}
            <strong>
              {OPEN_DATE.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
            </strong>
            . Check back then.
          </div>
        )}
        {status === "closed" && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Scoring closed on{" "}
            <strong>
              {CLOSE_DATE.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
            </strong>
            . These are the final standings.
          </div>
        )}

        {/* No data yet */}
        {categories.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            No judge scores submitted yet. Scores will appear here as judges evaluate shortlisted nominations.
          </Card>
        )}

        {/* Per-category leaderboards */}
        <div className="space-y-10">
          {categories.map(([catName, nominees], ci) => (
            <motion.section
              key={catName}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: ci * 0.05 }}
            >
              {/* Category header */}
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-serif text-xl font-bold">{catName}</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                <Badge variant="outline" className="border-primary/30 text-primary text-[11px]">
                  {nominees.length} nominee{nominees.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Nominee rows */}
              <div className="space-y-2">
                {nominees.map((nominee, idx) => {
                  const rank = idx + 1;
                  const pct = (nominee.avgScore / 5) * 100;
                  const isTop = rank <= 3;
                  return (
                    <div
                      key={nominee.nominationId}
                      className={`flex items-center gap-4 rounded-2xl border px-5 py-4 transition ${
                        rank === 1
                          ? "border-yellow-400/50 bg-yellow-50/60 shadow-sm"
                          : rank === 2
                          ? "border-slate-300/60 bg-slate-50/60"
                          : rank === 3
                          ? "border-amber-600/40 bg-amber-50/50"
                          : "border-primary/10 bg-white"
                      }`}
                    >
                      <RankBadge rank={rank} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className={`font-semibold ${isTop ? "text-base" : "text-sm"}`}>
                            {nominee.nomineeName}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <Stars value={nominee.avgScore} />
                            <span className="text-sm font-bold text-foreground">
                              {nominee.avgScore.toFixed(1)}<span className="text-muted-foreground font-normal">/5</span>
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rank === 1
                                ? "bg-yellow-400"
                                : rank === 2
                                ? "bg-slate-400"
                                : rank === 3
                                ? "bg-amber-600"
                                : "bg-primary/50"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Rated by {nominee.judgeCount} judge{nominee.judgeCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground">
          {[
            { color: "bg-yellow-400", label: "1st place" },
            { color: "bg-slate-300", label: "2nd place" },
            { color: "bg-amber-600", label: "3rd place" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded-full ${l.color}`} />
              {l.label}
            </span>
          ))}
          <span>· Scores update in real time</span>
          <span>· Deadline: {CLOSE_DATE.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </main>
    </div>
  );
}
