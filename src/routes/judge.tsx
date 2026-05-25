import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Lock, LogOut, Star, ChevronRight, Mail, Search, FileText, MessageSquare, CheckCircle2, Trophy, Clock, AlertTriangle } from "lucide-react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signIn, signOut as firebaseSignOut, subscribeToAuthState } from "@/lib/auth-firebase";
import { AWARD_THEME } from "@/data/awards";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type Nomination = {
  id: string;
  createdAt: { toDate?: () => Date } | string | null;
  categoryId: string;
  categoryName: string;
  nomineeName: string;
  nomineeEmail: string;
  studentNumber: string;
  faculty: string;
  yearOfStudy: string;
  nominatorName: string;
  nominatorEmail: string;
  nominatorRelationship: string;
  answers: Record<string, string>;
  status: "pending" | "shortlisted" | "rejected";
};

type JudgeScore = {
  nominationId: string;
  judgeUid: string;
  judgeEmail: string;
  nomineeName: string;
  categoryName: string;
  score: number; // 0-5 stars
  comment: string;
  updatedAt: { toDate?: () => Date } | null;
};

// ── Scoring window helpers ────────────────────────────────────────────────────
const OPEN_DATE = new Date(AWARD_THEME.scoringOpenDate);
const CLOSE_DATE = new Date(AWARD_THEME.scoringDeadline);

function getScoringStatus(): "before" | "open" | "closed" {
  const now = new Date();
  if (now < OPEN_DATE) return "before";
  if (now > CLOSE_DATE) return "closed";
  return "open";
}

// ── Interactive 0-5 star picker ───────────────────────────────────────────────
function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;

  return (
    <div
      className={`flex gap-1 ${disabled ? "pointer-events-none opacity-50" : ""}`}
      onMouseLeave={() => setHovered(null)}
      aria-label="Star rating"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? 0 : star)}
          onMouseEnter={() => setHovered(star)}
          className="transition-transform hover:scale-110 focus-visible:outline-none"
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          <Star
            className={`h-9 w-9 transition-colors ${
              star <= display
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 self-center text-sm font-bold text-foreground">
        {value === 0 ? "No rating" : value === 1 ? "Poor" : value === 2 ? "Fair" : value === 3 ? "Good" : value === 4 ? "Very good" : "Exceptional"}
      </span>
    </div>
  );
}

export const Route = createFileRoute("/judge")({
  component: JudgePage,
  head: () => ({
    meta: [{ title: "Judge Panel · SALEA 2026" }],
  }),
});

function JudgePage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToAuthState(async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();
        if (data?.role === "judge") {
          setAuthed(true);
        } else if (data?.role === "admin") {
          navigate({ to: "/admin" });
          return;
        } else {
          await firebaseSignOut();
          setErr("Your account does not have judge access.");
          setAuthed(false);
        }
      } else {
        setAuthed(false);
      }
      setChecking(false);
    });
    return unsub;
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (ex: unknown) {
      const code = (ex as { code?: string }).code ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setErr("Incorrect email or password.");
      } else if (code === "auth/too-many-requests") {
        setErr("Too many attempts. Please try again later.");
      } else {
        setErr("Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hero">
        <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-hero">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,oklch(0.90_0.04_260)_0%,transparent_60%)]" />
      <SiteNav />
      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-28">
        {!authed ? (
          <div className="mx-auto mt-20 max-w-md rounded-3xl border border-primary/30 bg-card/60 p-10 backdrop-blur">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-gold shadow-gold">
              <Star className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-center font-serif text-3xl font-bold">Judge Panel</h1>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Sign in with your judge account to review shortlisted nominations.
            </p>
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" autoFocus autoComplete="email" required />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" disabled={loading} className="w-full bg-gold text-primary-foreground">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>
        ) : (
          <JudgeDashboard onLogout={() => firebaseSignOut()} />
        )}
      </main>
    </div>
  );
}

function JudgeDashboard({ onLogout }: { onLogout: () => void }) {
  const uid = auth.currentUser?.uid ?? "";
  const judgeEmail = auth.currentUser?.email ?? "";

  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [myScores, setMyScores] = useState<Record<string, JudgeScore>>({});
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("__all__");
  const [detail, setDetail] = useState<Nomination | null>(null);
  const [scoreInput, setScoreInput] = useState(0);
  const [commentInput, setCommentInput] = useState("");
  const [saving, setSaving] = useState(false);

  const scoringStatus = getScoringStatus();
  const scoringOpen = scoringStatus === "open";

  // Only shortlisted nominations
  useEffect(() => {
    const q = query(
      collection(db, "nominations"),
      where("status", "==", "shortlisted"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setNominations(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Nomination))
          .sort((a, b) => {
            const aTime = a.createdAt && typeof a.createdAt === "object" && a.createdAt.toDate
              ? a.createdAt.toDate().getTime()
              : 0;
            const bTime = b.createdAt && typeof b.createdAt === "object" && b.createdAt.toDate
              ? b.createdAt.toDate().getTime()
              : 0;
            return bTime - aTime;
          }),
      );
    });
    return () => unsub();
  }, []);

  // This judge's own scores only
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "judge_scores"), where("judgeUid", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, JudgeScore> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as JudgeScore;
        map[data.nominationId] = data;
      });
      setMyScores(map);
    });
    return () => unsub();
  }, [uid]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    nominations.forEach((n) => seen.set(n.categoryId, n.categoryName ?? n.categoryId));
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [nominations]);

  const filtered = useMemo(() => {
    return nominations.filter((n) => {
      if (selectedCategory !== "__all__" && n.categoryId !== selectedCategory) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        return n.nomineeName?.toLowerCase().includes(s) || n.studentNumber?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [nominations, selectedCategory, search]);

  function openDetail(nom: Nomination) {
    setDetail(nom);
    const existing = myScores[nom.id];
    setScoreInput(existing?.score ?? 0);
    setCommentInput(existing?.comment ?? "");
  }

  async function saveScore() {
    if (!detail || !uid) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "judge_scores", `${detail.id}_${uid}`), {
        nominationId: detail.id,
        judgeUid: uid,
        judgeEmail,
        nomineeName: detail.nomineeName,
        categoryName: detail.categoryName,
        score: scoreInput,
        comment: commentInput,
        updatedAt: serverTimestamp(),
      });
      setMyScores((prev) => ({
        ...prev,
        [detail.id]: { nominationId: detail.id, judgeUid: uid, judgeEmail, nomineeName: detail.nomineeName, categoryName: detail.categoryName, score: scoreInput, comment: commentInput, updatedAt: null },
      }));
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => ({
    total: nominations.length,
    scored: nominations.filter((n) => !!myScores[n.id]).length,
    pending: nominations.filter((n) => !myScores[n.id]).length,
  }), [nominations, myScores]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">SALEA 2026</p>
          <h1 className="font-serif text-3xl font-bold sm:text-4xl">Judge Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{judgeEmail}</span>
          </p>
        </div>
        <Button variant="outline" onClick={onLogout} className="gap-2 border-primary/40 text-primary">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      {/* Scoring window banner */}
      {scoringStatus === "before" && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="h-5 w-5 shrink-0" />
          <span>Scoring opens on <strong>{OPEN_DATE.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</strong>. Nominations close 31 July 2026 — check back then.</span>
        </div>
      )}
      {scoringStatus === "closed" && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>The scoring period closed on <strong>{CLOSE_DATE.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</strong>. No further scores can be submitted.</span>
        </div>
      )}
      {scoringStatus === "open" && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Scoring is open. Deadline: <strong>{CLOSE_DATE.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</strong>.</span>
          <Link to="/leaderboard" className="ml-auto flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline">
            <Trophy className="h-4 w-4" /> Leaderboard
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Shortlisted", value: stats.total, cls: "text-blue-600" },
          { label: "Scored by me", value: stats.scored, cls: "text-green-600" },
          { label: "Still to review", value: stats.pending, cls: "text-amber-500" },
        ].map((s) => (
          <Card key={s.label} className="p-5 text-center">
            <p className={`font-serif text-3xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search nominee or student #…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="__all__">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No shortlisted nominations yet.</p>
        )}
        {filtered.map((nom) => {
          const scored = myScores[nom.id];
          return (
            <Card key={nom.id} className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-accent/30" onClick={() => openDetail(nom)}>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{nom.nomineeName}</p>
                  <p className="text-xs text-muted-foreground">{nom.categoryName} · {nom.faculty} · Year {nom.yearOfStudy}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {scored ? (
                  <Badge className="gap-1 border-green-400/30 bg-green-500/10 text-green-700">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < scored.score ? "fill-green-600 text-green-600" : "fill-muted text-muted-foreground/20"}`} />
                    ))}
                    <span className="ml-0.5">{scored.score}/5</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-400/40 text-amber-600">Awaiting score</Badge>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.nomineeName}</SheetTitle>
                <SheetDescription>{detail.categoryName} · {detail.faculty}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Student #", detail.studentNumber],
                  ["Faculty", detail.faculty],
                  ["Year of Study", detail.yearOfStudy],
                  ["Email", detail.nomineeEmail],
                  ["Nominated by", detail.nominatorName],
                  ["Relationship", detail.nominatorRelationship],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{value || "—"}</p>
                  </div>
                ))}
              </div>

              {Object.entries(detail.answers ?? {}).length > 0 && (
                <div className="mt-5 space-y-4 border-t pt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Nomination Responses</p>
                  {Object.entries(detail.answers).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs font-medium text-muted-foreground">{k}</p>
                      <p className="mt-0.5 text-sm">{v}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Scoring */}
              <div className="mt-6 space-y-4 border-t pt-6">
                <p className="flex items-center gap-2 font-semibold">
                  <MessageSquare className="h-4 w-4 text-primary" /> Your Evaluation
                </p>

                {!scoringOpen && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    scoringStatus === "before"
                      ? "border border-amber-200 bg-amber-50 text-amber-700"
                      : "border border-red-200 bg-red-50 text-red-700"
                  }`}>
                    {scoringStatus === "before" ? <Clock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {scoringStatus === "before" ? `Scoring opens ${OPEN_DATE.toLocaleDateString("en-ZA")}` : "Scoring period has closed — no edits allowed"}
                  </div>
                )}

                <div>
                  <Label className="mb-3 block text-xs uppercase tracking-wider text-muted-foreground">Star Rating (0 – 5)</Label>
                  <StarPicker value={scoreInput} onChange={setScoreInput} disabled={!scoringOpen} />
                </div>

                <div>
                  <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Comments &amp; justification</Label>
                  <Textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Provide your evaluation reasoning. This will be visible to admin."
                    rows={5}
                    disabled={!scoringOpen}
                  />
                </div>

                <Button
                  onClick={saveScore}
                  disabled={saving || !scoringOpen || scoreInput === 0}
                  className="w-full bg-gold text-primary-foreground disabled:opacity-50"
                >
                  {saving ? "Saving…" : <><CheckCircle2 className="mr-2 h-4 w-4" />{myScores[detail.id] ? "Update score" : "Submit score"}</>}
                </Button>
                {scoreInput === 0 && scoringOpen && (
                  <p className="text-center text-xs text-amber-600">Select at least 1 star to submit.</p>
                )}
                {myScores[detail.id] && (
                  <p className="text-center text-xs text-muted-foreground">Score recorded — admin can see your submission and timestamp.</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
