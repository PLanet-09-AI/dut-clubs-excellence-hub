// /demo — Interactive sandbox for practising judge scoring (no Firestore writes)
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Trophy,
  Play,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  BookOpen,
  AlertCircle,
  Medal,
  BarChart3,
  X,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EVALUATION_CRITERIA, computeWeightedAverage } from "@/data/awards";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "Demo Sandbox · SALEA 2026" },
      { name: "description", content: "Practice the judge rating flow with dummy nominees." },
    ],
  }),
});

// ─── Dummy nominees ───────────────────────────────────────────────────────────

type DemoNominee = {
  id: string;
  name: string;
  studentNumber: string;
  faculty: string;
  year: string;
  category: string;
  summary: string;
  achievements: string[];
};

const DEMO_NOMINEES: DemoNominee[] = [
  {
    id: "demo-1",
    name: "Ayanda Khumalo",
    studentNumber: "21001234",
    faculty: "Faculty of Engineering & the Built Environment",
    year: "3rd Year",
    category: "Dean of Students Prestigious Award",
    summary:
      "Ayanda led the DUT Engineering Society for two consecutive years, mentored over 40 first-year students, and maintained a 78% academic average while volunteering weekly at a local youth programme.",
    achievements: [
      "78% academic average — Dean's List 2025",
      "President, DUT Engineering Society (2024–2025)",
      "Mentor to 40+ first-year students",
      "Community tutor — Umlazi Youth Centre (3 hrs/week)",
      "Organised 'WomenInSTEM' campus conference (120 attendees)",
    ],
  },
  {
    id: "demo-2",
    name: "Sipho Ndlovu",
    studentNumber: "22005678",
    faculty: "Faculty of Accounting & Informatics",
    year: "4th Year",
    category: "Dean of Students Prestigious Award",
    summary:
      "Sipho founded the DUT Financial Literacy Club, reaching 300 students with free budgeting workshops. He holds a 76% average and represents DUT on the provincial student governance forum.",
    achievements: [
      "76% academic average",
      "Founder & Chair — DUT Financial Literacy Club",
      "300 students reached through free workshops",
      "Provincial SRC representative 2025",
      "Recipient — NSFAS Excellence Bursary",
    ],
  },
  {
    id: "demo-3",
    name: "Naledi Dube",
    studentNumber: "23009012",
    faculty: "Faculty of Health Sciences",
    year: "2nd Year",
    category: "Promotion of Healthy Lifestyle Award",
    summary:
      "Naledi spearheaded the campus Mental Health Awareness Week, attracting 500 students to stigma-reduction activities. She co-authored a peer-support handbook adopted by the DUT Counselling Centre.",
    achievements: [
      "Lead organiser — Mental Health Awareness Week (500 attendees)",
      "Co-author — DUT Peer Support Handbook",
      "Volunteer counsellor — DUT Student Wellness",
      "75% academic average",
      "First-year 'Rookie of the Year' award 2024",
    ],
  },
  {
    id: "demo-4",
    name: "Thandeka Mhlongo",
    studentNumber: "21003456",
    faculty: "Faculty of Arts & Design",
    year: "Postgraduate / Honours",
    category: "Exemplary Society/Club/Structure Award",
    summary:
      "Thandeka leads the DUT Afro-Arts Society, which won the national SASCO Cultural Competition. Under her presidency the society tripled its membership and secured R50 000 in sponsorships.",
    achievements: [
      "President — DUT Afro-Arts Society",
      "SASCO National Cultural Competition — 1st place",
      "Membership grew from 40 to 120 members",
      "Secured R50 000 sponsorship from local businesses",
      "Hosted annual cultural gala with 600 attendees",
    ],
  },
  {
    id: "demo-5",
    name: "Lwazi Sithole",
    studentNumber: "22007890",
    faculty: "Faculty of Engineering & the Built Environment",
    year: "3rd Year",
    category: "Sportsmanship Award",
    summary:
      "Lwazi captains the DUT Men's Football Team, leading them to the USSA regional finals for the first time in 10 years. Known for post-match community coaching at local schools.",
    achievements: [
      "Captain — DUT Men's Football Team",
      "USSA Regional Finals 2025 (first time in 10 years)",
      "Community football coaching — 3 local primary schools",
      "65% academic average (above requirement)",
      "Most Valuable Player — KZN Tertiary League 2025",
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type DemoScore = {
  criteriaScores: Record<string, number>;
  comment: string;
  overallScore: number;
  submittedAt: Date;
};

// ─── Star picker (same style as judge panel) ──────────────────────────────────

function StarPicker({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "lg";
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  const sz = size === "lg" ? "h-9 w-9" : "h-5 w-5";

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? 0 : star)}
          onMouseEnter={() => setHovered(star)}
          className="transition-transform hover:scale-110 focus-visible:outline-none"
        >
          <Star
            className={`${sz} transition-colors ${
              star <= display
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
      {size === "lg" && (
        <span className="ml-2 self-center text-sm font-bold text-foreground">
          {value === 0
            ? "No rating"
            : value === 1
            ? "Poor"
            : value === 2
            ? "Fair"
            : value === 3
            ? "Good"
            : value === 4
            ? "Very good"
            : "Exceptional"}
        </span>
      )}
    </div>
  );
}

// ─── Mini leaderboard ─────────────────────────────────────────────────────────

function MiniLeaderboard({ scores }: { scores: Record<string, DemoScore> }) {
  const ranked = useMemo(() => {
    return DEMO_NOMINEES.map((n) => ({
      ...n,
      score: scores[n.id]?.overallScore ?? 0,
      rated: !!scores[n.id],
    }))
      .filter((n) => n.rated)
      .sort((a, b) => b.score - a.score);
  }, [scores]);

  if (ranked.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-primary/20 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        Leaderboard will appear here as you rate nominees.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {ranked.map((n, i) => {
        const rank = i + 1;
        const pct = (n.score / 5) * 100;
        return (
          <div
            key={n.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              rank === 1
                ? "border-yellow-300/60 bg-yellow-50/60"
                : rank === 2
                ? "border-slate-300/50 bg-slate-50/50"
                : rank === 3
                ? "border-amber-500/30 bg-amber-50/40"
                : "border-primary/10 bg-white"
            }`}
          >
            {rank <= 3 ? (
              <div
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full shadow ${
                  rank === 1 ? "bg-yellow-400" : rank === 2 ? "bg-slate-300" : "bg-amber-600"
                }`}
              >
                {rank === 1 ? (
                  <Trophy className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Medal className="h-3.5 w-3.5 text-white" />
                )}
              </div>
            ) : (
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/20 bg-muted text-xs font-bold text-muted-foreground">
                {rank}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{n.name}</p>
                <span className="shrink-0 text-sm font-bold text-foreground">
                  {n.score.toFixed(1)}
                  <span className="text-xs font-normal text-muted-foreground">/5</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
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
              <p className="mt-0.5 text-[11px] text-muted-foreground">{n.category}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function DemoPage() {
  const [selected, setSelected] = useState<DemoNominee | null>(null);
  const [scores, setScores] = useState<Record<string, DemoScore>>({});
  const [criteriaInput, setCriteriaInput] = useState<Record<string, number>>({});
  const [commentInput, setCommentInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"nominees" | "leaderboard">("nominees");

  const criteria = EVALUATION_CRITERIA;

  const ratedCount = criteria.filter((c) => (criteriaInput[c.id] ?? 0) > 0).length;
  const overallPreview = computeWeightedAverage(criteriaInput, criteria);

  function openNominee(n: DemoNominee) {
    setSelected(n);
    setSavedId(null);
    const existing = scores[n.id];
    setCriteriaInput(existing?.criteriaScores ?? {});
    setCommentInput(existing?.comment ?? "");
  }

  function closeNominee() {
    setSelected(null);
    setSavedId(null);
  }

  async function submitScore() {
    if (!selected || ratedCount === 0) return;
    setSaving(true);
    // Simulate a small delay to mimic a network request
    await new Promise((r) => setTimeout(r, 700));
    const overall = computeWeightedAverage(criteriaInput, criteria);
    setScores((prev) => ({
      ...prev,
      [selected.id]: {
        criteriaScores: { ...criteriaInput },
        comment: commentInput,
        overallScore: overall,
        submittedAt: new Date(),
      },
    }));
    setSavedId(selected.id);
    setSaving(false);
  }

  function resetAll() {
    if (!confirm("Reset all demo scores? This clears your practice data.")) return;
    setScores({});
    setCriteriaInput({});
    setCommentInput("");
    setSelected(null);
    setSavedId(null);
  }

  const totalRated = Object.keys(scores).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gray-50 text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.02_260)_0%,transparent_60%)]" />
      <SiteNav />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-2 flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              SALEA 2026 · Demo Sandbox
            </p>
          </div>
          <h1 className="font-serif text-4xl font-bold sm:text-5xl">
            Practice <span className="text-gradient-gold">Voting</span>
          </h1>
          <p className="mt-3 max-w-lg text-base text-muted-foreground">
            Rate the dummy nominees below exactly as you would in the real judge panel. Nothing is
            saved to the database — this is a safe practice environment.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />
              Demo mode — no real data is affected
            </div>
            <Badge variant="outline" className="border-green-300 text-green-700">
              {totalRated}/{DEMO_NOMINEES.length} rated
            </Badge>
            {totalRated > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            )}
            <Link
              to="/guide"
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-muted/30 transition"
            >
              <BookOpen className="h-3 w-3" /> View guide
            </Link>
          </div>
        </motion.div>

        {/* Tab toggle */}
        <div className="mb-6 flex overflow-hidden rounded-xl border border-primary/20 bg-muted/30 w-fit">
          {(["nominees", "leaderboard"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition capitalize ${
                tab === t
                  ? "bg-gold text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "nominees" ? (
                <>
                  <Star className="h-4 w-4" /> Rate Nominees
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" /> Leaderboard
                  {totalRated > 0 && (
                    <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                      {totalRated}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "nominees" ? (
            <motion.div
              key="nominees"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              {/* Nominee list */}
              {!selected ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {DEMO_NOMINEES.map((n, i) => {
                    const scored = scores[n.id];
                    return (
                      <motion.button
                        key={n.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        type="button"
                        onClick={() => openNominee(n)}
                        className="group text-left rounded-2xl border border-primary/20 bg-white p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          {scored ? (
                            <span className="flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Rated {scored.overallScore.toFixed(1)}/5
                            </span>
                          ) : (
                            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              Not rated
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground font-medium">
                            Demo #{i + 1}
                          </span>
                        </div>

                        <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-primary transition-colors">
                          {n.name}
                        </h3>
                        <p className="mt-1 text-xs text-primary font-medium">{n.category}</p>
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{n.summary}</p>

                        <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                          <p>
                            <span className="font-medium text-foreground/70">Faculty</span>{" "}
                            {n.faculty.replace("Faculty of ", "")}
                          </p>
                          <p>
                            <span className="font-medium text-foreground/70">Year</span> {n.year}
                          </p>
                        </div>

                        {scored && (
                          <div className="mt-3 flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.round(scored.overallScore)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "fill-muted text-muted-foreground/20"
                                }`}
                              />
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          Rate this nominee <ChevronRight className="h-3 w-3" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                /* Rating panel */
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="grid gap-6 lg:grid-cols-[1fr_420px]"
                >
                  {/* Left: nominee profile */}
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={closeNominee}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
                    >
                      <X className="h-4 w-4" /> Back to nominees
                    </button>

                    <Card className="p-6">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {selected.category}
                          </p>
                          <h2 className="mt-1 font-serif text-2xl font-bold">{selected.name}</h2>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            #{selected.studentNumber} · {selected.faculty.replace("Faculty of ", "")} ·{" "}
                            {selected.year}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Demo
                        </span>
                      </div>

                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {selected.summary}
                      </p>

                      <div className="mt-5">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                          Key Achievements
                        </p>
                        <ul className="space-y-1.5">
                          {selected.achievements.map((a) => (
                            <li key={a} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>

                    {/* Hint box */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                      <p className="font-semibold mb-1">💡 Demo tip</p>
                      <p>
                        In the real judge panel you would also see uploaded evidence (PDFs, Word
                        docs, images) in a preview pane on the left. Rate this nominee using the
                        criteria on the right, then click Submit.
                      </p>
                    </div>
                  </div>

                  {/* Right: scoring panel */}
                  <div className="space-y-4">
                    <Card className="overflow-hidden">
                      <div className="border-b border-primary/10 bg-muted/20 px-5 py-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-2 font-bold text-foreground">
                            <MessageSquare className="h-4 w-4 text-primary" /> Your Evaluation
                          </p>
                          <div
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                              overallPreview > 0
                                ? "bg-gold/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                overallPreview > 0 ? "fill-yellow-400 text-yellow-400" : ""
                              }`}
                            />
                            {overallPreview.toFixed(1)}/5 overall
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Rate {criteria.length} criteria · {ratedCount}/{criteria.length} rated
                        </p>
                      </div>

                      <div className="space-y-3 p-5">
                        {/* Criteria */}
                        {criteria.map((c, i) => (
                          <div
                            key={c.id}
                            className={`rounded-xl border p-4 transition ${
                              (criteriaInput[c.id] ?? 0) > 0
                                ? "border-yellow-300/60 bg-yellow-50/40"
                                : "border-primary/10 bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <Label className="block text-sm font-semibold text-foreground">
                                <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                  {i + 1}
                                </span>
                                {c.label}
                              </Label>
                              {(criteriaInput[c.id] ?? 0) > 0 && (
                                <span className="shrink-0 text-xs font-bold text-yellow-600">
                                  {criteriaInput[c.id]}/5
                                </span>
                              )}
                            </div>
                            {c.description && (
                              <p className="ml-7 mt-0.5 text-xs text-muted-foreground">
                                {c.description}
                              </p>
                            )}
                            <div className="mt-3">
                              <StarPicker
                                value={criteriaInput[c.id] ?? 0}
                                onChange={(v) =>
                                  setCriteriaInput((prev) => ({ ...prev, [c.id]: v }))
                                }
                              />
                            </div>
                          </div>
                        ))}

                        {/* Comment */}
                        <div className="rounded-xl border border-primary/15 bg-blue-50/40 p-4">
                          <Label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            Judge's Comments
                            <span className="ml-auto text-xs font-normal text-muted-foreground">
                              {commentInput.length}/1000
                            </span>
                          </Label>
                          <Textarea
                            value={commentInput}
                            onChange={(e) =>
                              setCommentInput(e.target.value.slice(0, 1000))
                            }
                            placeholder="Write your evaluation notes here — strengths, areas for improvement, reasoning for your ratings…"
                            rows={5}
                            className="resize-y bg-white"
                          />
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            In the real panel this is visible to admin only, not nominees.
                          </p>
                        </div>

                        {/* Submit */}
                        <Button
                          onClick={submitScore}
                          disabled={saving || ratedCount === 0}
                          className="w-full bg-gold text-primary-foreground disabled:opacity-50"
                          size="lg"
                        >
                          {saving ? (
                            <span className="flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                              Saving…
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              {scores[selected.id] ? "Update demo score" : "Submit demo score"}
                              {overallPreview > 0 && (
                                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                                  {overallPreview.toFixed(1)}/5
                                </span>
                              )}
                            </span>
                          )}
                        </Button>

                        {ratedCount === 0 && (
                          <p className="text-center text-xs text-amber-600">
                            Rate at least one criterion to submit.
                          </p>
                        )}

                        {savedId === selected.id && (
                          <div className="flex flex-col items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                            <p className="text-sm font-semibold text-green-700">
                              Demo score submitted!
                            </p>
                            <p className="text-xs text-green-600">
                              Overall: {scores[selected.id]?.overallScore.toFixed(2)}/5. Switch to the
                              Leaderboard tab to see the ranking update.
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={closeNominee}
                                className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 transition"
                              >
                                Rate another nominee
                              </button>
                              <button
                                type="button"
                                onClick={() => setTab("leaderboard")}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition"
                              >
                                View leaderboard
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="max-w-2xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h2 className="font-serif text-xl font-bold">Demo Leaderboard</h2>
                <Badge variant="outline" className="border-amber-300 text-amber-700 text-[11px]">
                  Practice only
                </Badge>
              </div>
              <p className="mb-5 text-sm text-muted-foreground">
                Ranked by your overall score (weighted average). Rate more nominees to fill the
                board.
              </p>
              <MiniLeaderboard scores={scores} />

              {totalRated < DEMO_NOMINEES.length && (
                <div className="mt-6 rounded-xl border border-dashed border-primary/20 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                  {DEMO_NOMINEES.length - totalRated} nominee
                  {DEMO_NOMINEES.length - totalRated !== 1 ? "s" : ""} still to rate.{" "}
                  <button
                    type="button"
                    onClick={() => setTab("nominees")}
                    className="font-semibold text-primary hover:underline"
                  >
                    Rate them →
                  </button>
                </div>
              )}

              {totalRated === DEMO_NOMINEES.length && (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
                  <p className="font-serif font-bold text-green-800">All nominees rated!</p>
                  <p className="mt-1 text-xs text-green-600">
                    You're ready for the real judge panel. Sign in at{" "}
                    <Link to="/judge" className="font-semibold underline">
                      /judge
                    </Link>
                    .
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
