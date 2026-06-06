import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Lock,
  LogOut,
  Star,
  ChevronRight,
  ChevronLeft,
  Mail,
  Search,
  FileText,
  MessageSquare,
  CheckCircle2,
  Trophy,
  Clock,
  AlertTriangle,
  Eye,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  X as XIcon,
} from "lucide-react";
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
import {
  AWARD_THEME,
  AWARD_CATEGORIES,
  getCriteriaForCategory,
  computeWeightedAverage,
} from "@/data/awards";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  uploads?: Record<
    string,
    Record<
      string,
      {
        name: string;
        url: string;
        size: number;
        path: string;
        previewPdfUrl?: string;
        previewPdfPath?: string;
      }[]
    >
  >;
  status: "pending" | "shortlisted" | "rejected";
};

type PreviewKind = "pdf" | "office";

function getPreviewKind(
  fileName: string,
  fileUrl: string,
  previewPdfUrl?: string,
): PreviewKind | null {
  if (previewPdfUrl) return "pdf";
  const target = `${fileName} ${fileUrl}`;
  if (/\.pdf($|\?)/i.test(target)) return "pdf";
  if (/\.(doc|docx|ppt|pptx|pps|ppsx|xls|xlsx)($|\?)/i.test(target)) return "office";
  return null;
}

function isOfficeEmbeddableUrl(fileUrl: string): boolean {
  if (!fileUrl) return false;

  try {
    const parsed = new URL(fileUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    ) {
      return false;
    }

    // Block private IPv4 ranges that Office Online cannot reach.
    if (
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

type JudgeScore = {
  nominationId: string;
  judgeUid: string;
  judgeEmail: string;
  nomineeName: string;
  categoryName: string;
  score: number; // 0-5 overall (weighted average of criteriaScores)
  /** Per-criterion star ratings keyed by criterion id */
  criteriaScores?: Record<string, number>;
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
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
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
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    autoFocus
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-primary-foreground"
              >
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
  const [criteriaInput, setCriteriaInput] = useState<Record<string, number>>({});
  const [commentInput, setCommentInput] = useState("");
  const [saving, setSaving] = useState(false);

  const scoringStatus = getScoringStatus();
  const scoringOpen = scoringStatus === "open";

  // Only shortlisted nominations
  useEffect(() => {
    const q = query(collection(db, "nominations"), where("status", "==", "shortlisted"));
    const unsub = onSnapshot(q, (snap) => {
      setNominations(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Nomination)
          .sort((a, b) => {
            const aTime =
              a.createdAt && typeof a.createdAt === "object" && a.createdAt.toDate
                ? a.createdAt.toDate().getTime()
                : 0;
            const bTime =
              b.createdAt && typeof b.createdAt === "object" && b.createdAt.toDate
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
        return (
          n.nomineeName?.toLowerCase().includes(s) || n.studentNumber?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [nominations, selectedCategory, search]);

  function openDetail(nom: Nomination) {
    setDetail(nom);
    const existing = myScores[nom.id];
    setCriteriaInput(existing?.criteriaScores ?? {});
    setCommentInput(existing?.comment ?? "");
  }

  async function saveScore() {
    if (!detail || !uid) return;
    setSaving(true);
    try {
      const criteria = getCriteriaForCategory(detail.categoryId);
      const overall = computeWeightedAverage(criteriaInput, criteria);
      await setDoc(doc(db, "judge_scores", `${detail.id}_${uid}`), {
        nominationId: detail.id,
        judgeUid: uid,
        judgeEmail,
        nomineeName: detail.nomineeName,
        categoryName: detail.categoryName,
        categoryId: detail.categoryId,
        score: overall,
        criteriaScores: criteriaInput,
        comment: commentInput,
        updatedAt: serverTimestamp(),
      });
      setMyScores((prev) => ({
        ...prev,
        [detail.id]: {
          nominationId: detail.id,
          judgeUid: uid,
          judgeEmail,
          nomineeName: detail.nomineeName,
          categoryName: detail.categoryName,
          score: overall,
          criteriaScores: criteriaInput,
          comment: commentInput,
          updatedAt: null,
        },
      }));
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(
    () => ({
      total: nominations.length,
      scored: nominations.filter((n) => !!myScores[n.id]).length,
      pending: nominations.filter((n) => !myScores[n.id]).length,
    }),
    [nominations, myScores],
  );

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
        <Button
          variant="outline"
          onClick={onLogout}
          className="gap-2 border-primary/40 text-primary"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      {/* Scoring window banner */}
      {scoringStatus === "before" && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="h-5 w-5 shrink-0" />
          <span>
            Scoring opens on{" "}
            <strong>
              {OPEN_DATE.toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
            . Nominations close 31 July 2026 (nomination window: 01 July 2026 - 31 July 2026) - check back then.
          </span>
        </div>
      )}
      {scoringStatus === "closed" && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            The scoring period closed on{" "}
            <strong>
              {CLOSE_DATE.toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
            . No further scores can be submitted.
          </span>
        </div>
      )}
      {scoringStatus === "open" && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            Scoring is open. Deadline:{" "}
            <strong>
              {CLOSE_DATE.toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
            .
          </span>
          <Link
            to="/leaderboard"
            className="ml-auto flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline"
          >
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
          <Input
            placeholder="Search nominee or student #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="__all__">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No shortlisted nominations yet.
          </p>
        )}
        {filtered.map((nom) => {
          const scored = myScores[nom.id];
          return (
            <Card
              key={nom.id}
              className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-accent/30"
              onClick={() => openDetail(nom)}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{nom.nomineeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {nom.categoryName} · {nom.faculty} · Year {nom.yearOfStudy}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {scored ? (
                  <Badge className="gap-1 border-green-400/30 bg-green-500/10 text-green-700">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < Math.round(scored.score) ? "fill-green-600 text-green-600" : "fill-muted text-muted-foreground/20"}`}
                      />
                    ))}
                    <span className="ml-0.5">{scored.score.toFixed(1)}/5</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-400/40 text-amber-600">
                    Awaiting score
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent
          side="right"
          className="h-screen w-screen max-w-none overflow-hidden p-0 sm:max-w-none"
        >
          {detail && (
            <JudgeNominationDetail
              nom={detail}
              criteriaInput={criteriaInput}
              setCriteriaInput={setCriteriaInput}
              commentInput={commentInput}
              setCommentInput={setCommentInput}
              saving={saving}
              scoringOpen={scoringOpen}
              scoringStatus={scoringStatus}
              hasScore={!!myScores[detail.id]}
              onSave={saveScore}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Judge Nomination Detail (two-pane: preview left, details+scoring right) ── */
function JudgeNominationDetail({
  nom,
  criteriaInput,
  setCriteriaInput,
  commentInput,
  setCommentInput,
  saving,
  scoringOpen,
  scoringStatus,
  hasScore,
  onSave,
}: {
  nom: Nomination;
  criteriaInput: Record<string, number>;
  setCriteriaInput: (v: Record<string, number>) => void;
  commentInput: string;
  setCommentInput: (v: string) => void;
  saving: boolean;
  scoringOpen: boolean;
  scoringStatus: "before" | "open" | "closed";
  hasScore: boolean;
  onSave: () => void;
}) {
  const catData = AWARD_CATEGORIES.find((c) => c.id === nom.categoryId);
  const criteria = getCriteriaForCategory(nom.categoryId);
  const overallPreview = computeWeightedAverage(criteriaInput, criteria);
  const ratedCount = criteria.filter((c) => (criteriaInput[c.id] ?? 0) > 0).length;

  const evidenceFiles = useMemo(() => {
    type EvidenceFile = {
      questionId: string;
      evidenceLabel: string;
      file: { name: string; url: string; size: number; path: string };
      kind: "pdf" | "office";
    };
    const files: EvidenceFile[] = [];
    if (!catData?.questions) return files;
    for (const q of catData.questions) {
      for (let idx = 0; idx < (q.evidence?.length ?? 0); idx++) {
        const slotFiles = nom.uploads?.[q.id]?.[`e${idx}`] ?? [];
        for (const file of slotFiles) {
          const kind = getPreviewKind(file.name, file.url, file.previewPdfUrl);
          if (kind)
            files.push({
              questionId: q.id,
              evidenceLabel: q.evidence?.[idx] ?? "Evidence",
              file,
              kind,
            });
        }
      }
    }
    return files;
  }, [catData, nom.uploads]);

  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(110);
  const [previewPage, setPreviewPage] = useState(1);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [officePreviewError, setOfficePreviewError] = useState(false);
  const [runtimePreviewPdfUrls, setRuntimePreviewPdfUrls] = useState<Record<string, string>>({});
  const [runtimeConvertingPath, setRuntimeConvertingPath] = useState<string | null>(null);
  const [runtimeConversionError, setRuntimeConversionError] = useState<string | null>(null);

  useEffect(() => {
    if (evidenceFiles.length === 0) {
      setPreviewPath(null);
      setMobilePreviewOpen(false);
      return;
    }
    const exists = evidenceFiles.some(({ file }) => file.path === previewPath);
    if (!exists) {
      setPreviewPath(evidenceFiles[0].file.path);
      setPreviewPage(1);
      setPreviewZoom(110);
    }
  }, [evidenceFiles, previewPath]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobilePreviewOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(runtimePreviewPdfUrls).forEach((blobUrl) => {
        URL.revokeObjectURL(blobUrl);
      });
    };
  }, [runtimePreviewPdfUrls]);

  const activePreview = useMemo(
    () => evidenceFiles.find(({ file }) => file.path === previewPath) ?? null,
    [evidenceFiles, previewPath],
  );
  const activePreviewIndex = useMemo(
    () =>
      activePreview
        ? evidenceFiles.findIndex(({ file }) => file.path === activePreview.file.path)
        : -1,
    [activePreview, evidenceFiles],
  );

  const activeRuntimePdfUrl =
    activePreview && activePreview.file.path
      ? runtimePreviewPdfUrls[activePreview.file.path]
      : undefined;

  const activePdfUrl = activePreview?.file.previewPdfUrl ?? activeRuntimePdfUrl;

  const resolvedKind: "pdf" | "office" | null =
    activePreview && activePreview.kind === "office" && activePdfUrl
      ? "pdf"
      : activePreview?.kind ?? null;

  const canEmbedOfficePreview = !!(
    activePreview &&
    activePreview.kind === "office" &&
    !activePdfUrl &&
    isOfficeEmbeddableUrl(activePreview.file.url)
  );

  const shouldEmbedOffice =
    !!activePreview &&
    activePreview.kind === "office" &&
    !activePdfUrl &&
    canEmbedOfficePreview &&
    !officePreviewError;
  const activePreviewUrl = activePreview
    ? resolvedKind === "pdf"
      ? `${activePdfUrl ?? activePreview.file.url}#page=${previewPage}&zoom=${previewZoom}`
      : shouldEmbedOffice
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activePreview.file.url)}`
        : activePreview.file.url
    : "";

  useEffect(() => {
    setOfficePreviewError(false);
  }, [previewPath]);

  useEffect(() => {
    const target = activePreview?.file;
    const kind = activePreview?.kind;

    if (!target || kind !== "office") {
      setRuntimeConvertingPath(null);
      setRuntimeConversionError(null);
      return;
    }

    if (target.previewPdfUrl || runtimePreviewPdfUrls[target.path]) {
      setRuntimeConvertingPath(null);
      setRuntimeConversionError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setRuntimeConvertingPath(target.path);
        setRuntimeConversionError(null);

        const response = await fetch("/api/office-to-pdf", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sourceUrl: target.url, fileName: target.name }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || "Conversion failed");
        }

        const pdfBlob = await response.blob();
        if (cancelled) return;

        const objectUrl = URL.createObjectURL(pdfBlob);
        setRuntimePreviewPdfUrls((prev) => {
          const existing = prev[target.path];
          if (existing) URL.revokeObjectURL(existing);
          return { ...prev, [target.path]: objectUrl };
        });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to convert Office file";
          setRuntimeConversionError(message);
        }
      } finally {
        if (!cancelled) {
          setRuntimeConvertingPath((current) =>
            current === target.path ? null : current,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activePreview?.file, activePreview?.kind, runtimePreviewPdfUrls]);

  function openPreview(path: string) {
    setPreviewPath(path);
    setPreviewPage(1);
    setPreviewZoom(110);
    if (typeof window !== "undefined" && window.innerWidth < 1024) setMobilePreviewOpen(true);
  }

  function goToFile(offset: -1 | 1) {
    if (activePreviewIndex < 0) return;
    const next = activePreviewIndex + offset;
    if (next < 0 || next >= evidenceFiles.length) return;
    setPreviewPath(evidenceFiles[next].file.path);
    setPreviewPage(1);
    setPreviewZoom(110);
  }

  function formatDate(ts: Nomination["createdAt"]) {
    if (!ts) return "—";
    if (typeof ts === "object" && ts.toDate)
      return ts
        .toDate()
        .toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
    return String(ts);
  }

  return (
    <div className="flex h-full w-full">
      {/* Desktop document preview pane (left) */}
      <aside className="hidden h-full flex-1 border-r border-primary/15 bg-muted/20 lg:flex lg:min-w-[56vw] lg:flex-col xl:min-w-[60vw]">
        <div className="border-b border-primary/15 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Document Preview
          </p>
          <p className="text-[11px] text-muted-foreground">
            Preview PDFs and Office files in-app with keyboard-friendly controls.
          </p>
        </div>
        <div className="border-b border-primary/10 px-4 py-3">
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            htmlFor="judge-preview-selector"
          >
            Select document
          </label>
          <select
            id="judge-preview-selector"
            value={previewPath ?? ""}
            onChange={(e) => openPreview(e.target.value)}
            className="w-full rounded-lg border border-primary/20 bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            disabled={evidenceFiles.length === 0}
            aria-label="Select a document to preview"
          >
            {evidenceFiles.length === 0 ? (
              <option value="">No previewable files available</option>
            ) : (
              evidenceFiles.map(({ file, evidenceLabel, kind }, index) => (
                <option key={file.path} value={file.path}>
                  {index + 1}. {evidenceLabel} - {file.name} ({kind.toUpperCase()})
                </option>
              ))
            )}
          </select>
          {activePreview && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Current selection:{" "}
              <span className="font-medium text-foreground">{activePreview.evidenceLabel}</span>
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-primary/10 px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToFile(-1)}
              disabled={activePreviewIndex <= 0}
              aria-label="Previous file"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToFile(1)}
              disabled={activePreviewIndex < 0 || activePreviewIndex >= evidenceFiles.length - 1}
              aria-label="Next file"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
              disabled={!activePreview || activePreview.kind !== "pdf" || previewPage <= 1}
              aria-label="Previous page"
            >
              Page -
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewPage((p) => p + 1)}
              disabled={!activePreview || activePreview.kind !== "pdf"}
              aria-label="Next page"
            >
              Page +
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewZoom((z) => Math.max(60, z - 10))}
              disabled={!activePreview}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewZoom((z) => Math.min(220, z + 10))}
              disabled={!activePreview}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPreviewZoom(110);
                setPreviewPage(1);
              }}
              disabled={!activePreview}
              aria-label="Reset view"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewPath(null)}
              disabled={!activePreview}
              aria-label="Close preview"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-muted-foreground">
          <span>{activePreview ? activePreview.file.name : "No document selected"}</span>
          {activePreview && (
            <span>
              {activePreview.kind.toUpperCase()} {activePreviewIndex + 1} / {evidenceFiles.length}
              {resolvedKind === "pdf" ? ` · Page ${previewPage}` : ""}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 px-3 pb-3">
          {activePreview ? (
            runtimeConvertingPath === activePreview.file.path ? (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-primary/20 bg-white p-4 text-center">
                <div className="max-w-sm space-y-2">
                  <p className="text-sm font-semibold text-foreground">Converting document…</p>
                  <p className="text-xs text-muted-foreground">
                    Preparing a PDF preview for this Office file. This can take a few seconds.
                  </p>
                </div>
              </div>
            ) : activePreview.kind === "office" && !shouldEmbedOffice && !activePdfUrl ? (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-amber-300/80 bg-amber-50 p-4 text-center">
                <div className="max-w-sm space-y-3">
                  <p className="text-sm font-semibold text-amber-900">Preview unavailable</p>
                  <p className="text-xs text-amber-800">
                    {runtimeConversionError
                      ? "Automatic conversion failed and this Office file cannot be embedded here. Open or download the file instead."
                      : "This Office file cannot be embedded in the in-app viewer. Open or download the file instead."}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <a href={activePreview.file.url} target="_blank" rel="noopener noreferrer">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                      </Button>
                    </a>
                    <a href={activePreview.file.url} download>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                      >
                        <Download className="mr-1 h-3.5 w-3.5" /> Download
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <iframe
                key={activePreview.file.path}
                src={activePreviewUrl}
                title={`Document preview for ${activePreview.file.name}`}
                className="h-full w-full rounded-lg border border-primary/20 bg-white"
                onError={() => {
                  if (activePreview.kind === "office") {
                    setOfficePreviewError(true);
                  }
                }}
              />
            )
          ) : (
            <div className="grid h-full place-items-center rounded-lg border border-dashed border-primary/20 bg-white p-4 text-center text-xs text-muted-foreground">
              Select a previewable file from the evidence list to preview it here.
            </div>
          )}
        </div>
      </aside>

      {/* Right pane: details + scoring */}
      <div className="flex h-full min-w-0 w-full flex-col lg:w-[40vw] lg:min-w-[420px] xl:w-[36vw]">
        {/* Header */}
        <div className="border-b border-primary/15 bg-white px-6 py-5">
          <SheetHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                {nom.categoryName ?? nom.categoryId}
              </Badge>
              {evidenceFiles.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {evidenceFiles.length} previewable file{evidenceFiles.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <SheetTitle className="font-serif text-2xl text-left">{nom.nomineeName}</SheetTitle>
            <SheetDescription className="text-left text-sm text-muted-foreground">
              {nom.nomineeEmail} · #{nom.studentNumber}
            </SheetDescription>
          </SheetHeader>
          {evidenceFiles.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                className="bg-gold text-primary-foreground"
                onClick={() => openPreview(evidenceFiles[0].file.path)}
                aria-label="Preview first available document"
              >
                <Eye className="mr-1.5 h-4 w-4" /> Preview File
              </Button>
              <p className="text-xs text-muted-foreground">
                {evidenceFiles.length} previewable file{evidenceFiles.length !== 1 ? "s" : ""}{" "}
                available.
              </p>
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Key info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Faculty", nom.faculty],
              ["Year", nom.yearOfStudy],
              ["Student #", nom.studentNumber],
              ["Submitted", formatDate(nom.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-primary/15 bg-gray-50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                <p className="mt-0.5 font-semibold text-foreground">{v ?? "—"}</p>
              </div>
            ))}
          </div>

          {/* Nominator */}
          <div className="space-y-0.5 rounded-xl border border-primary/15 bg-gray-50 p-4 text-sm">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Nominated by
            </p>
            <p className="font-semibold">{nom.nominatorName}</p>
            <p className="text-muted-foreground">{nom.nominatorEmail}</p>
            {nom.nominatorRelationship && (
              <p className="text-muted-foreground">{nom.nominatorRelationship}</p>
            )}
          </div>

          {/* Answers + evidence */}
          {nom.answers && Object.keys(nom.answers).length > 0 && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-primary">
                Answers &amp; Evidence
              </p>
              <div className="space-y-4">
                {catData
                  ? catData.questions.map((q) =>
                      nom.answers[q.id] || nom.uploads?.[q.id] ? (
                        <div
                          key={q.id}
                          className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm"
                        >
                          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            {q.section}
                          </p>
                          <p className="mb-2 text-xs italic text-muted-foreground">{q.prompt}</p>
                          {nom.answers[q.id] && (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {nom.answers[q.id]}
                            </p>
                          )}
                          {q.evidence?.map((label, idx) => {
                            const slotFiles = nom.uploads?.[q.id]?.[`e${idx}`] ?? [];
                            if (!slotFiles.length) return null;
                            return (
                              <div key={idx} className="mt-3">
                                <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                                  {label}
                                </p>
                                {slotFiles.map((file) => {
                                  const kind = getPreviewKind(
                                    file.name,
                                    file.url,
                                    file.previewPdfUrl,
                                  );
                                  return (
                                    <div
                                      key={file.path}
                                      className="flex flex-wrap items-center gap-2 py-1"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          kind
                                            ? openPreview(file.path)
                                            : window.open(file.url, "_blank", "noopener,noreferrer")
                                        }
                                        className="inline-flex min-w-0 items-center gap-1.5 text-left text-xs text-primary hover:underline"
                                        aria-label={
                                          kind ? `Preview ${file.name}` : `Open ${file.name}`
                                        }
                                      >
                                        <FileText className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{file.name}</span>
                                        <span className="ml-1 text-[10px] text-muted-foreground">
                                          (
                                          {file.size < 1024 * 1024
                                            ? `${(file.size / 1024).toFixed(0)} KB`
                                            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                                          )
                                        </span>
                                      </button>
                                      {kind && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2 text-[11px]"
                                          onClick={() => openPreview(file.path)}
                                        >
                                          <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                                        </Button>
                                      )}
                                      <a href={file.url} download>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-[11px]"
                                        >
                                          <Download className="mr-1 h-3.5 w-3.5" /> Download
                                        </Button>
                                      </a>
                                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-[11px]"
                                        >
                                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                                        </Button>
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      ) : null,
                    )
                  : Object.entries(nom.answers).map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm"
                      >
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">{k}</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{v}</p>
                      </div>
                    ))}
              </div>
            </div>
          )}

          {/* Scoring */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-semibold">
                <MessageSquare className="h-4 w-4 text-primary" /> Your Evaluation
              </p>
              <Badge variant="outline" className="border-primary/30 text-primary">
                {overallPreview.toFixed(1)}/5 overall
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Rate each criterion below. The overall score is the weighted average of your
              criterion ratings.
            </p>
            {!scoringOpen && (
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${scoringStatus === "before" ? "border border-amber-200 bg-amber-50 text-amber-700" : "border border-red-200 bg-red-50 text-red-700"}`}
              >
                {scoringStatus === "before" ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {scoringStatus === "before"
                  ? `Scoring opens ${OPEN_DATE.toLocaleDateString("en-ZA")}`
                  : "Scoring period has closed — no edits allowed"}
              </div>
            )}

            {/* Per-criterion star pickers */}
            <div className="space-y-4">
              {criteria.map((c) => (
                <div key={c.id} className="rounded-xl border border-primary/10 bg-gray-50 p-4">
                  <Label className="block text-sm font-semibold text-foreground">{c.label}</Label>
                  {c.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                  )}
                  <div className="mt-3">
                    <StarPicker
                      value={criteriaInput[c.id] ?? 0}
                      onChange={(v) =>
                        setCriteriaInput({ ...criteriaInput, [c.id]: v })
                      }
                      disabled={!scoringOpen}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                Comments &amp; justification
              </Label>
              <Textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Provide your evaluation reasoning. This will be visible to admin."
                rows={5}
                disabled={!scoringOpen}
              />
            </div>
            <Button
              onClick={onSave}
              disabled={saving || !scoringOpen || ratedCount === 0}
              className="w-full bg-gold text-primary-foreground disabled:opacity-50"
            >
              {saving ? (
                "Saving…"
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {hasScore ? "Update evaluation" : "Submit evaluation"}
                </>
              )}
            </Button>
            {ratedCount === 0 && scoringOpen && (
              <p className="text-center text-xs text-amber-600">
                Rate at least one criterion to submit.
              </p>
            )}
            {hasScore && (
              <p className="text-center text-xs text-muted-foreground">
                Evaluation recorded — admin can see your per-criterion ratings and timestamp.
              </p>
            )}
          </div>
        </div>

        {/* Mobile preview overlay */}
        {mobilePreviewOpen && activePreview && (
          <div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Document Preview"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-2 border-b border-primary/15 px-4 py-3">
                <p className="truncate text-xs font-semibold uppercase tracking-wider text-primary">
                  {activePreview.file.name}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMobilePreviewOpen(false)}
                  aria-label="Close document preview"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-primary/10 px-3 py-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => goToFile(-1)}
                    disabled={activePreviewIndex <= 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => goToFile(1)}
                    disabled={activePreviewIndex >= evidenceFiles.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    disabled={activePreview.kind !== "pdf" || previewPage <= 1}
                  >
                    Page -
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewPage((p) => p + 1)}
                    disabled={activePreview.kind !== "pdf"}
                  >
                    Page +
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewZoom((z) => Math.max(60, z - 10))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewZoom((z) => Math.min(220, z + 10))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewZoom(110);
                      setPreviewPage(1);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1 p-2">
                {runtimeConvertingPath === activePreview.file.path ? (
                  <div className="grid h-full place-items-center rounded-lg border border-dashed border-primary/20 bg-white p-4 text-center">
                    <div className="max-w-sm space-y-2">
                      <p className="text-sm font-semibold text-foreground">Converting document…</p>
                      <p className="text-xs text-muted-foreground">
                        Preparing a PDF preview for this Office file. This can take a few seconds.
                      </p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    key={activePreview.file.path}
                    src={activePreviewUrl}
                    title={`Preview: ${activePreview.file.name}`}
                    className="h-full w-full rounded-lg border border-primary/20 bg-white"
                    onError={() => {
                      if (resolvedKind === "office") {
                        setOfficePreviewError(true);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
