import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Lock,
  LogOut,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ChevronDown,
  FileText,
  Mail,
  Search,
  Filter,
  X as XIcon,
  Star,
  Users2,
  Eye,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Play,
  Info,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  convertOfficeToPdfBlob,
  OFFICE_FILE_PATTERN,
  IMAGE_FILE_PATTERN,
} from "@/lib/office-to-pdf";
import {
  signIn,
  signOut as firebaseSignOut,
  subscribeToAuthState,
  resetPassword,
  registerUser,
} from "@/lib/auth-firebase";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AWARD_CATEGORIES } from "@/data/awards";

// ─── Firestore nomination type (includes per-category answers) ───────────────
type NominationStatus = "pending" | "shortlisted" | "rejected";

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
  isSelfNomination?: boolean;
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
  status: NominationStatus;
};

type PreviewKind = "pdf" | "office" | "image";

function hasFileExtension(value: string, extensionPattern: RegExp): boolean {
  if (!value) return false;

  const normalized = (() => {
    try {
      const parsed = new URL(value);
      return decodeURIComponent(parsed.pathname);
    } catch {
      return decodeURIComponent(value);
    }
  })();

  return extensionPattern.test(normalized);
}

function getPreviewKind(
  fileName: string,
  fileUrl: string,
  previewPdfUrl?: string,
): PreviewKind | null {
  if (previewPdfUrl) return "pdf";
  if (hasFileExtension(fileName, /\.pdf$/i) || hasFileExtension(fileUrl, /\.pdf$/i)) return "pdf";
  if (
    hasFileExtension(fileName, OFFICE_FILE_PATTERN) ||
    hasFileExtension(fileUrl, OFFICE_FILE_PATTERN)
  ) {
    return "office";
  }
  if (
    hasFileExtension(fileName, IMAGE_FILE_PATTERN) ||
    hasFileExtension(fileUrl, IMAGE_FILE_PATTERN)
  ) {
    return "image";
  }
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

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Admin · SALEA 2026 Awards Management" }],
  }),
});

// ─── Admin quick-start guide ──────────────────────────────────────────────────

const ADMIN_STEPS = [
  { num: 1, title: "Review incoming nominations", body: "Every submission lands here as 'Pending'. Open a nomination card to read the full answers, view uploaded evidence (PDFs, transcripts, images) in the document preview pane, and check the nominee's details." },
  { num: 2, title: "Shortlist or reject", body: "Use the Shortlist / Reject buttons inside a nomination to move it to the correct queue. Shortlisted nominations are visible to judges for scoring. You can undo a decision at any time." },
  { num: 3, title: "Filter & search", body: "Use the search bar to find a nominee by name or student number. Use the category tiles to narrow to one award, or click the Self-nominated stat card to see only self-nominations." },
  { num: 4, title: "Preview documents", body: "Uploaded Word docs, PowerPoints and Excel files are converted to PDF automatically in-app — no downloads needed. Use the zoom, page and navigation controls in the preview pane." },
  { num: 5, title: "Export shortlisted CSV", body: "Click 'Export shortlisted' (top right) to download a CSV of all shortlisted nominees for printing or offline review." },
  { num: 6, title: "Monitor judge activity", body: "The Judge Activity tab shows every judge's score per nomination — including their per-criterion star ratings and written comments. Use this to check progress and identify nominees that haven't been scored yet." },
  { num: 7, title: "View the leaderboard", body: "Once scoring is open, visit /leaderboard to see nominees ranked by total stars from all judges. You can also share the leaderboard link with judges." },
  { num: 8, title: "Manage categories (Admin only)", body: "The Categories tab lets you add custom award categories. Only accounts with the 'admin' Firestore role can do this — judge-access accounts see all other tabs but cannot manage categories." },
];

const JUDGE_ADMIN_STEPS = [
  { num: 1, title: "View shortlisted nominations", body: "You can browse all shortlisted nominations and open each one to read answers and preview evidence documents." },
  { num: 2, title: "Document preview", body: "Uploaded Word docs, PowerPoints and Excel files are converted to PDF for in-app preview. Use zoom, page and navigation controls." },
  { num: 3, title: "Judge Activity tab", body: "See all judge scores per nomination. Your scoring is done in the Judge Panel (/judge), not here." },
  { num: 4, title: "Leaderboard", body: "Visit /leaderboard to see live rankings once scoring is open." },
];

function AdminQuickGuide({ canManage }: { canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(canManage ? "adminGuideDismissed" : "judgeAdminGuideDismissed") === "1"; } catch { return false; }
  });
  const steps = canManage ? ADMIN_STEPS : JUDGE_ADMIN_STEPS;
  const storageKey = canManage ? "adminGuideDismissed" : "judgeAdminGuideDismissed";

  function dismiss() {
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    setDismissed(true);
  }

  if (dismissed) {
    return (
      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setDismissed(false); try { localStorage.removeItem(storageKey); } catch { /* ignore */ } setOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-muted/30 transition"
        >
          <BookOpen className="h-3.5 w-3.5" /> Show quick guide
        </button>
        <Link to="/guide" className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-muted/30 transition">
          <Info className="h-3.5 w-3.5" /> Full guide
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-primary/20 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/20 transition"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            {canManage ? "Admin Quick Guide — How to manage nominations" : "Judge Access Guide — What you can do here"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{steps.length} steps · expand to read</p>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-primary/10 px-5 py-4">
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.num} className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground mt-0.5">{step.num}</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-primary/10 pt-4">
            <Link to="/guide" className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-white px-4 py-2 text-xs font-semibold text-primary hover:bg-muted/30 transition">
              <BookOpen className="h-3.5 w-3.5" /> Full guide
            </Link>
            <button type="button" onClick={dismiss} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition underline-offset-2 hover:underline">
              Don't show again
            </button>
          </div>
        </div>
      )}

      {!open && (
        <div className="border-t border-primary/10 bg-muted/20 px-5 py-2.5 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Click above to expand the step-by-step guide. <Link to="/guide" className="font-semibold text-primary hover:underline">View full guide →</Link></p>
          <button type="button" onClick={dismiss} className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition">Dismiss</button>
        </div>
      )}
    </div>
  );
}

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "judge" | null>(null);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"admin" | "judge">("admin");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToAuthState(async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();
        if (data?.role === "admin" || data?.role === "judge") {
          setUserRole(data.role);
          setAuthed(true);
          return;
        }
        await firebaseSignOut();
        setErr("Your account does not have admin panel access.");
      }
      setUserRole(null);
      setAuthed(!!user);
    });
    return unsub;
  }, [navigate]);

  function switchMode(m: "signin" | "register") {
    setMode(m);
    setErr("");
    setResetSent(false);
    setPassword("");
    setConfirm("");
    setRole("admin");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (mode === "register") {
      if (password.length < 8) {
        setErr("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setErr("Passwords do not match.");
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        const cred = await registerUser(email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          email: cred.user.email,
          role,
          createdAt: serverTimestamp(),
        });
      }
    } catch (ex: unknown) {
      const code = (ex as { code?: string }).code ?? "";
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setErr("Incorrect email or password.");
      } else if (code === "auth/email-already-in-use") {
        setErr("An account with this email already exists. Sign in instead.");
      } else if (code === "auth/weak-password") {
        setErr("Password is too weak. Use at least 8 characters.");
      } else if (code === "auth/too-many-requests") {
        setErr("Too many attempts. Please try again later.");
      } else {
        setErr(
          mode === "signin"
            ? "Sign-in failed. Please try again."
            : "Registration failed. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email) {
      setErr("Enter your email address first.");
      return;
    }
    try {
      await resetPassword(email);
      setResetSent(true);
      setErr("");
    } catch {
      setErr("Could not send reset email. Check the address and try again.");
    }
  }

  async function logout() {
    await firebaseSignOut();
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-hero">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,oklch(0.90_0.04_260)_0%,transparent_60%)]" />
      <SiteNav />
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-28 pb-16">
        {!authed ? (
          <div className="mx-auto mt-20 max-w-md rounded-3xl border border-primary/30 bg-card/60 p-10 backdrop-blur">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-gold shadow-gold">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-center font-serif text-3xl font-bold">Admin Panel</h1>

            {/* Mode toggle */}
            <div className="mt-5 flex overflow-hidden rounded-xl border border-primary/20 bg-muted/40">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`flex-1 py-2 text-sm font-medium transition ${mode === "signin" ? "bg-gold text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 py-2 text-sm font-medium transition ${mode === "register" ? "bg-gold text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                Create account
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              {mode === "signin"
                ? "Sign in with your Student Services administrator account."
                : "Register a new administrator account."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                />
              </div>
              {mode === "register" && (
                <>
                  <div>
                    <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                      Confirm password
                    </Label>
                    <Input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                      Account role
                    </Label>
                    <div className="flex overflow-hidden rounded-xl border border-primary/20 bg-muted/40">
                      {(["admin", "judge"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`flex-1 py-2 text-sm font-medium capitalize transition ${role === r ? "bg-gold text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {role === "judge"
                        ? "Judges can review and score shortlisted nominations."
                        : "Admins can manage nominations and categories."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-xs text-foreground/85">
                    <p className="font-semibold text-primary">Create Judge Account Helper</p>
                    <p className="mt-1 text-muted-foreground">
                      To create judge access, choose <strong>judge</strong> as account role, then
                      register with the judge's email and password. The account will be redirected
                      to the Judge Panel after successful registration.
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Tip: use role <strong>admin</strong> only for Student Services management
                      accounts.
                    </p>
                  </div>
                </>
              )}
              {err && <p className="text-sm text-destructive">{err}</p>}
              {resetSent && (
                <p className="text-sm text-green-600">
                  Password reset email sent — check your inbox.
                </p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-primary-foreground"
              >
                {loading
                  ? mode === "signin"
                    ? "Signing in…"
                    : "Creating account…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </Button>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </form>
          </div>
        ) : (
          <Dashboard onLogout={logout} role={userRole ?? "admin"} />
        )}
      </main>
    </div>
  );
}

function Dashboard({ onLogout, role }: { onLogout: () => void; role: "admin" | "judge" }) {
  const canManage = role === "admin";
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<"all" | NominationStatus>("all");
  const [selfNomFilter, setSelfNomFilter] = useState(false);
  const [search, setSearch] = useState("");
  const [detailNom, setDetailNom] = useState<Nomination | null>(null);
  const [extraCategories, setExtraCategories] = useState<
    { id: string; name: string; tagline: string }[]
  >([]);
  const [newCat, setNewCat] = useState({ name: "", tagline: "" });
  const [judgeScores, setJudgeScores] = useState<
    Array<{
      id: string;
      nominationId: string;
      judgeUid: string;
      judgeEmail: string;
      nomineeName: string;
      categoryName: string;
      score: number;
      criteriaScores?: Record<string, number>;
      comment: string;
      updatedAt: { toDate?: () => Date } | null;
    }>
  >([]);

  // All categories = static + admin-added (from Firestore)
  const allCategories = useMemo(
    () => [
      ...AWARD_CATEGORIES.map((c) => ({
        id: c.id,
        name: c.name,
        tagline: c.tagline,
        isStatic: true,
      })),
      ...extraCategories.map((c) => ({ ...c, isStatic: false })),
    ],
    [extraCategories],
  );

  // Real-time Firestore listener — nominations
  useEffect(() => {
    const q = canManage
      ? query(collection(db, "nominations"), orderBy("createdAt", "desc"))
      : query(collection(db, "nominations"), where("status", "==", "shortlisted"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
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
        });
      setNominations(docs);
    });
    return () => unsub();
  }, [canManage]);

  // Real-time Firestore listener — custom categories
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "admin_categories"), (snap) => {
      setExtraCategories(
        snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as { id: string; name: string; tagline: string },
        ),
      );
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listener — all judge scores (admin supervision)
  useEffect(() => {
    const q = query(collection(db, "judge_scores"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setJudgeScores(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as (typeof judgeScores)[number]),
      );
    });
    return () => unsub();
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    const id = `custom_${crypto.randomUUID()}`;
    await setDoc(doc(db, "admin_categories", id), {
      name: newCat.name.trim(),
      tagline: newCat.tagline.trim(),
      createdAt: serverTimestamp(),
    });
    setNewCat({ name: "", tagline: "" });
  }

  async function removeExtraCategory(id: string) {
    if (!confirm("Remove this category? This cannot be undone.")) return;
    await deleteDoc(doc(db, "admin_categories", id));
  }

  const stats = useMemo(
    () => ({
      total: nominations.length,
      pending: nominations.filter((n) => n.status === "pending").length,
      shortlisted: nominations.filter((n) => n.status === "shortlisted").length,
      rejected: nominations.filter((n) => n.status === "rejected").length,
      selfNominated: nominations.filter((n) => n.isSelfNomination).length,
    }),
    [nominations],
  );

  // Build category tiles — only categories that have at least one nomination
  const categoryTiles = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const n of nominations) {
      const key = n.categoryId;
      if (!map.has(key)) map.set(key, { id: key, name: n.categoryName ?? n.categoryId, count: 0 });
      map.get(key)!.count++;
    }
    return Array.from(map.values());
  }, [nominations]);

  const filtered = useMemo(() => {
    return nominations.filter((n) => {
      if (selectedCategory !== "__all__" && n.categoryId !== selectedCategory) return false;
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (selfNomFilter && !n.isSelfNomination) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        return (
          n.nomineeName?.toLowerCase().includes(s) ||
          n.studentNumber?.toLowerCase().includes(s) ||
          n.nominatorName?.toLowerCase().includes(s) ||
          n.nomineeEmail?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [nominations, selectedCategory, statusFilter, selfNomFilter, search]);

  async function update(id: string, status: NominationStatus) {
    if (!canManage) return;
    await updateDoc(doc(db, "nominations", id), { status, updatedAt: serverTimestamp() });
    // Refresh detail panel if open
    setDetailNom((prev) => (prev?.id === id ? { ...prev, status } : prev));
  }

  async function remove(id: string) {
    if (!canManage) return;
    if (!confirm("Delete this nomination? This cannot be undone.")) return;
    await deleteDoc(doc(db, "nominations", id));
    setDetailNom((prev) => (prev?.id === id ? null : prev));
  }

  function exportCsv() {
    const rows = nominations.filter((n) => n.status === "shortlisted");
    if (rows.length === 0) return;

    // Build a master ordered list of all question IDs + prompts across all exported rows
    const questionMap = new Map<string, string>(); // id → prompt
    for (const r of rows) {
      const catData = AWARD_CATEGORIES.find((c) => c.id === r.categoryId);
      if (catData) {
        for (const q of catData.questions) {
          if (!questionMap.has(q.id)) questionMap.set(q.id, q.prompt);
        }
      } else if (r.answers) {
        for (const k of Object.keys(r.answers)) {
          if (!questionMap.has(k)) questionMap.set(k, k);
        }
      }
    }
    const questionIds = Array.from(questionMap.keys());

    const baseHeaders = [
      "Category",
      "Nominee",
      "Student #",
      "Faculty",
      "Year",
      "Email",
      "Nominator",
      "Relationship",
      "Submitted",
    ];
    // Alternate prompt/answer columns so reviewers see the question beside the answer
    const qHeaders = questionIds.flatMap((id) => [questionMap.get(id) ?? id, `Answer`]);
    const header = [...baseHeaders, ...qHeaders];

    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const csv = [
      header.map(escape).join(","),
      ...rows.map((r) => {
        const date =
          r.createdAt && typeof r.createdAt === "object" && r.createdAt.toDate
            ? r.createdAt.toDate().toISOString()
            : String(r.createdAt ?? "");
        const base = [
          r.categoryName ?? r.categoryId,
          r.nomineeName,
          r.studentNumber,
          r.faculty,
          r.yearOfStudy,
          r.nomineeEmail,
          r.nominatorName,
          r.nominatorRelationship,
          date,
        ];
        const answers = questionIds.flatMap((id) => {
          const catData = AWARD_CATEGORIES.find((c) => c.id === r.categoryId);
          const prompt =
            catData?.questions.find((q) => q.id === id)?.prompt ?? questionMap.get(id) ?? id;
          const answer = r.answers?.[id] ?? "";
          // Only include if this question belongs to this category
          const belongsToCategory = catData?.questions.some((q) => q.id === id) ?? false;
          return belongsToCategory ? [prompt, answer] : ["", ""];
        });
        return [...base, ...answers].map(escape).join(",");
      }),
    ].join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salea-shortlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(ts: Nomination["createdAt"]) {
    if (!ts) return "—";
    if (typeof ts === "object" && ts.toDate)
      return ts
        .toDate()
        .toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
    return String(ts);
  }

  const STATUS_FILTERS: { label: string; value: "all" | NominationStatus }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Shortlisted", value: "shortlisted" },
    { label: "Rejected", value: "rejected" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">SALEA 2026</p>
          <h1 className="font-serif text-3xl font-bold sm:text-4xl">
            {canManage ? "Administration Panel" : "Review Panel"}
          </h1>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button
              onClick={exportCsv}
              disabled={stats.shortlisted === 0}
              variant="outline"
              className="border-primary/40 text-primary"
            >
              <Download className="mr-2 h-4 w-4" />{" "}
              <span className="hidden sm:inline">Export shortlisted</span> ({stats.shortlisted})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onLogout}
            className="border-primary/40 bg-primary/5 text-primary"
          >
            <LogOut className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>

      {!canManage && (
        <Card className="border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Judge access mode: you can view nominations and use in-app document preview. Admin actions
          are disabled.
        </Card>
      )}

      {/* Quick-start guide */}
      <AdminQuickGuide canManage={canManage} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} color="amber" />
        <StatCard label="Shortlisted" value={stats.shortlisted} color="gold" />
        <StatCard label="Rejected" value={stats.rejected} color="red" />
        <button
          onClick={() => setSelfNomFilter((v) => !v)}
          className={`rounded-2xl border p-4 text-center transition ${selfNomFilter ? "border-blue-400/60 bg-blue-50 shadow" : "border-primary/15 bg-white hover:border-primary/30"}`}
        >
          <p className={`font-serif text-3xl font-bold ${selfNomFilter ? "text-blue-600" : "text-blue-500"}`}>{stats.selfNominated}</p>
          <p className="mt-1 text-xs text-muted-foreground">Self-nominated</p>
          {selfNomFilter && (
            <p className="mt-1 text-[10px] font-semibold text-blue-600">● Filtered</p>
          )}
        </button>
      </div>

      {/* Category tiles */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Filter className="h-3 w-3" /> Filter by Category
        </p>
        <div className="flex flex-wrap gap-2">
          <CategoryChip
            label="All nominations"
            count={nominations.length}
            active={selectedCategory === "__all__"}
            onClick={() => setSelectedCategory("__all__")}
          />
          {categoryTiles.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              count={c.count}
              active={selectedCategory === c.id}
              onClick={() => setSelectedCategory(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Search + status filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search nominee, student number, nominator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex overflow-hidden rounded-xl border border-primary/20 bg-muted/30 shrink-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium transition ${statusFilter === f.value ? "bg-gold text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {nominations.length > 0 && (
        <p className="text-sm text-muted-foreground -mt-4">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
          {nominations.length} nominations
          {selectedCategory !== "__all__" && (
            <>
              {" "}
              in{" "}
              <span className="text-primary font-medium">
                {categoryTiles.find((c) => c.id === selectedCategory)?.name}
              </span>
            </>
          )}
        </p>
      )}

      {/* Tabs: Nominations | Categories | Judge Activity */}
      <Tabs defaultValue="nominations">
        <TabsList className="bg-card/60">
          <TabsTrigger value="nominations">Nominations</TabsTrigger>
          {canManage && <TabsTrigger value="categories">Categories</TabsTrigger>}
          {canManage && (
            <TabsTrigger value="judges" className="gap-1.5">
              <Users2 className="h-3.5 w-3.5" /> Judge Activity
              {judgeScores.length > 0 && (
                <span className="ml-1 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {judgeScores.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="nominations" className="mt-6">
          {nominations.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              No nominations yet. Submissions from the public form will appear here in real time.
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              No nominations match your filters.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((n) => {
                const totalFiles = n.uploads
                  ? Object.values(n.uploads)
                      .flatMap((slots) => Object.values(slots))
                      .flat().length
                  : 0;
                return (
                  <button
                    key={n.id}
                    onClick={() => setDetailNom(n)}
                    className="group text-left rounded-2xl border border-primary/20 bg-white p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <StatusBadge status={n.status} />
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-primary transition-colors">
                      {n.nomineeName}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {n.categoryName ?? n.categoryId}
                    </p>
                    <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground/70">Student #</span>{" "}
                        {n.studentNumber}
                      </p>
                      <p>
                        <span className="font-medium text-foreground/70">Faculty</span> {n.faculty}
                      </p>
                      <p>
                        <span className="font-medium text-foreground/70">Year</span> {n.yearOfStudy}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        By {n.nominatorName}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {n.isSelfNomination && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            Self-nominated
                          </span>
                        )}
                        {totalFiles > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary font-medium">
                            <FileText className="h-3 w-3" /> {totalFiles}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      View details <ChevronDown className="h-3 w-3 -rotate-90" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        {canManage && (
          <TabsContent value="categories" className="mt-6 space-y-6">
            {/* Add custom category form */}
            <Card className="p-6">
              <h3 className="font-serif text-lg font-bold mb-1">Add custom category</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Custom categories are saved to Firestore and appear on the nomination form alongside
                the built-in eight.
              </p>
              <form onSubmit={addCategory} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <Input
                  placeholder="Category name"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  required
                />
                <Input
                  placeholder="Tagline / eligibility summary"
                  value={newCat.tagline}
                  onChange={(e) => setNewCat({ ...newCat, tagline: e.target.value })}
                />
                <Button type="submit" className="bg-gold text-primary-foreground">
                  Add
                </Button>
              </form>
            </Card>

            {/* Built-in categories (read-only) */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Built-in categories (8)
              </p>
              <div className="space-y-2">
                {AWARD_CATEGORIES.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-primary/15 bg-white px-5 py-4"
                  >
                    <div>
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.tagline}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[10px] border-primary/30 text-primary"
                    >
                      Built-in
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom / admin-added categories */}
            {extraCategories.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Custom categories ({extraCategories.length})
                </p>
                <div className="space-y-2">
                  {extraCategories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start justify-between gap-4 rounded-xl border border-primary/20 bg-white px-5 py-4"
                    >
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{c.tagline}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeExtraCategory(c.id)}
                        className="text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {/* ── Judge Activity tab ─── */}
        {canManage && (
          <TabsContent value="judges" className="mt-6">
            {judgeScores.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                No judge scores submitted yet.
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  All judge evaluations in real time — sorted newest first. Each entry is
                  timestamped.
                </p>
                {judgeScores.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-primary/15 bg-white px-5 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{s.nomineeName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{s.categoryName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5 rounded-full bg-gold/10 px-3 py-1 font-bold text-yellow-700">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < Math.round(s.score) ? "fill-yellow-500 text-yellow-500" : "fill-muted text-muted-foreground/20"}`}
                            />
                          ))}
                          <span className="ml-1 text-sm">{s.score.toFixed(1)}/5</span>
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        <span className="font-medium text-foreground/70">Judge</span> {s.judgeEmail}
                      </span>
                      <span>
                        <span className="font-medium text-foreground/70">Submitted</span>{" "}
                        {s.updatedAt && typeof s.updatedAt === "object" && s.updatedAt.toDate
                          ? s.updatedAt
                              .toDate()
                              .toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })
                          : "—"}
                      </span>
                    </div>
                    {s.comment && (
                      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-600">Judge's comment</p>
                        <p className="text-sm italic text-foreground/80">"{s.comment}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Detail slide-over */}
      <Sheet
        open={!!detailNom}
        onOpenChange={(open) => {
          if (!open) setDetailNom(null);
        }}
      >
        <SheetContent
          side="right"
          className="h-screen w-screen max-w-none overflow-hidden p-0 sm:max-w-none"
        >
          {detailNom && (
            <NominationDetail
              nom={detailNom}
              onUpdate={update}
              onDelete={remove}
              formatDate={formatDate}
              canManage={canManage}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Category chip ─────────────────────────────────────────────────── */
function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "border-primary bg-gold text-primary-foreground shadow-gold"
          : "border-primary/20 bg-white text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}
      >
        {count}
      </span>
    </button>
  );
}

/* ── Stat card ─────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "gold" | "amber" | "red";
}) {
  const accent =
    color === "gold"
      ? "border-yellow-400/60 bg-yellow-50"
      : color === "amber"
        ? "border-orange-300/60 bg-orange-50"
        : color === "red"
          ? "border-red-300/60 bg-red-50"
          : "";
  const text =
    color === "gold"
      ? "text-yellow-600"
      : color === "amber"
        ? "text-orange-500"
        : color === "red"
          ? "text-red-500"
          : "";
  return (
    <Card className={`p-5 ${accent}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-3xl font-bold ${text || "text-foreground"}`}>{value}</p>
    </Card>
  );
}

/* ── Status badge ──────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: NominationStatus }) {
  if (status === "shortlisted")
    return (
      <Badge className="bg-gold text-primary-foreground gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Shortlisted
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Rejected
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-orange-300 text-orange-600 gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

/* ── Nomination detail panel ───────────────────────────────────────── */
function NominationDetail({
  nom,
  onUpdate,
  onDelete,
  formatDate,
  canManage,
}: {
  nom: Nomination;
  onUpdate: (id: string, s: NominationStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  formatDate: (ts: Nomination["createdAt"]) => string;
  canManage: boolean;
}) {
  const catData = AWARD_CATEGORIES.find((c) => c.id === nom.categoryId);
  const totalFiles = nom.uploads
    ? Object.values(nom.uploads)
        .flatMap((slots) => Object.values(slots))
        .flat().length
    : 0;

  const evidenceFiles = useMemo(() => {
    type EvidenceFile = {
      questionId: string;
      evidenceLabel: string;
      file: {
        name: string;
        url: string;
        size: number;
        path: string;
        previewPdfUrl?: string;
        previewPdfPath?: string;
      };
    };
    const files: EvidenceFile[] = [];
    if (!catData?.questions) return files;
    for (const q of catData.questions) {
      for (let idx = 0; idx < (q.evidence?.length ?? 0); idx++) {
        const slotFiles = (nom.uploads?.[q.id]?.[`e${idx}`] ?? []) as Array<{
          name: string;
          url: string;
          size: number;
          path: string;
          previewPdfUrl?: string;
          previewPdfPath?: string;
        }>;
        for (const file of slotFiles) {
          files.push({
            questionId: q.id,
            evidenceLabel: q.evidence?.[idx] ?? "Evidence",
            file,
          });
        }
      }
    }
    return files;
  }, [catData, nom.uploads]);

  const previewableFiles = useMemo(
    () =>
      evidenceFiles.flatMap((entry) => {
        const kind = getPreviewKind(entry.file.name, entry.file.url, entry.file.previewPdfUrl);
        return kind ? [{ ...entry, kind }] : [];
      }),
    [evidenceFiles],
  );

  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(110);
  const [previewPage, setPreviewPage] = useState(1);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [officePreviewError, setOfficePreviewError] = useState(false);
  const [runtimePreviewPdfUrls, setRuntimePreviewPdfUrls] = useState<Record<string, string>>({});
  const [runtimeConvertingPath, setRuntimeConvertingPath] = useState<string | null>(null);
  const [runtimeConversionError, setRuntimeConversionError] = useState<string | null>(null);

  useEffect(() => {
    if (previewableFiles.length === 0) {
      setPreviewPath(null);
      setMobilePreviewOpen(false);
      return;
    }
    const exists = previewableFiles.some(({ file }) => file.path === previewPath);
    if (!exists) {
      setPreviewPath(previewableFiles[0].file.path);
      setPreviewPage(1);
      setPreviewZoom(110);
    }
  }, [previewableFiles, previewPath]);

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
    () => previewableFiles.find(({ file }) => file.path === previewPath)?.file ?? null,
    [previewableFiles, previewPath],
  );

  const activePreviewMeta = useMemo(
    () => previewableFiles.find(({ file }) => file.path === previewPath) ?? null,
    [previewableFiles, previewPath],
  );

  const activePreviewIndex = useMemo(
    () =>
      activePreview
        ? previewableFiles.findIndex(({ file }) => file.path === activePreview.path)
        : -1,
    [activePreview, previewableFiles],
  );

  const activeRuntimePdfUrl =
    activePreview && activePreview.path ? runtimePreviewPdfUrls[activePreview.path] : undefined;

  const activePdfUrl = activePreview?.previewPdfUrl ?? activeRuntimePdfUrl;

  const resolvedKind: PreviewKind | null =
    activePreviewMeta?.kind === "office" && activePdfUrl ? "pdf" : activePreviewMeta?.kind ?? null;

  const canEmbedOfficePreview = !!(
    activePreview &&
    activePreviewMeta?.kind === "office" &&
    !activePdfUrl &&
    isOfficeEmbeddableUrl(activePreview.url)
  );

  const shouldEmbedOffice =
    !!activePreview &&
    activePreviewMeta?.kind === "office" &&
    !activePdfUrl &&
    canEmbedOfficePreview &&
    !officePreviewError;

  const activePreviewUrl = activePreview
    ? resolvedKind === "pdf"
      ? `${activePdfUrl ?? activePreview.url}#page=${previewPage}&zoom=${previewZoom}`
      : shouldEmbedOffice
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activePreview.url)}`
        : activePreview.url
    : "";

  useEffect(() => {
    setOfficePreviewError(false);
  }, [previewPath]);

  useEffect(() => {
    const target = activePreview;
    const kind = activePreviewMeta?.kind;

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

        const pdfBlob = await convertOfficeToPdfBlob(target.url, target.name);
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
          setRuntimeConvertingPath((current) => (current === target.path ? null : current));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activePreview, activePreviewMeta?.kind, runtimePreviewPdfUrls]);

  function openPreview(path: string) {
    setPreviewPath(path);
    setPreviewPage(1);
    setPreviewZoom(110);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobilePreviewOpen(true);
    }
  }

  function closePreview() {
    setPreviewPath(null);
    setMobilePreviewOpen(false);
  }

  function goToPreviewFile(offset: -1 | 1) {
    if (activePreviewIndex < 0) return;
    const next = activePreviewIndex + offset;
    if (next < 0 || next >= previewableFiles.length) return;
    setPreviewPath(previewableFiles[next].file.path);
    setPreviewPage(1);
    setPreviewZoom(110);
  }

  return (
    <div className="flex h-full w-full">
      {/* Desktop preview pane (left) */}
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
            htmlFor="desktop-preview-selector"
          >
            Select document
          </label>
          <select
            id="desktop-preview-selector"
            value={previewPath ?? ""}
            onChange={(e) => openPreview(e.target.value)}
            className="w-full rounded-lg border border-primary/20 bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            disabled={previewableFiles.length === 0}
            aria-label="Select a document to preview"
          >
            {previewableFiles.length === 0 ? (
              <option value="">No previewable files available</option>
            ) : (
              previewableFiles.map(({ file, evidenceLabel, kind }, index) => (
                <option key={file.path} value={file.path}>
                  {index + 1}. {evidenceLabel} - {file.name} ({kind.toUpperCase()})
                </option>
              ))
            )}
          </select>
          {activePreviewMeta && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Current selection:{" "}
              <span className="font-medium text-foreground">{activePreviewMeta.evidenceLabel}</span>
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-primary/10 px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToPreviewFile(-1)}
              disabled={activePreviewIndex <= 0}
              aria-label="Previous preview file"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToPreviewFile(1)}
              disabled={activePreviewIndex < 0 || activePreviewIndex >= previewableFiles.length - 1}
              aria-label="Next preview file"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
              disabled={!activePreview || activePreviewMeta?.kind !== "pdf" || previewPage <= 1}
              aria-label="Previous PDF page"
            >
              Page -
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewPage((p) => p + 1)}
              disabled={!activePreview || activePreviewMeta?.kind !== "pdf"}
              aria-label="Next PDF page"
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
              aria-label="Zoom out PDF"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewZoom((z) => Math.min(220, z + 10))}
              disabled={!activePreview}
              aria-label="Zoom in PDF"
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
              aria-label="Reset PDF view"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closePreview}
              disabled={!activePreview}
              aria-label="Close document preview"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-muted-foreground">
          <span>{activePreview ? activePreview.name : "No document selected"}</span>
          {activePreview && (
            <span>
              {activePreviewMeta?.kind?.toUpperCase()} {activePreviewIndex + 1} /{" "}
              {previewableFiles.length}
              {resolvedKind === "pdf" ? ` · Page ${previewPage}` : ""}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 px-3 pb-3">
          {activePreview ? (
            runtimeConvertingPath === activePreview.path ? (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-primary/20 bg-white p-4 text-center">
                <div className="max-w-sm space-y-2">
                  <p className="text-sm font-semibold text-foreground">Converting document…</p>
                  <p className="text-xs text-muted-foreground">
                    Preparing a PDF preview for this Office file. This can take a few seconds.
                  </p>
                </div>
              </div>
            ) : activePreviewMeta?.kind === "office" && !shouldEmbedOffice && !activePdfUrl ? (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-amber-300/80 bg-amber-50 p-4 text-center">
                <div className="max-w-sm space-y-3">
                  <p className="text-sm font-semibold text-amber-900">Preview unavailable</p>
                  <p className="text-xs text-amber-800">
                    {runtimeConversionError
                      ? "Automatic conversion failed and this Office file cannot be embedded here. Open or download the file instead."
                      : "This Office file cannot be embedded in the in-app viewer. Open or download the file instead."}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <a href={activePreview.url} target="_blank" rel="noopener noreferrer">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                      </Button>
                    </a>
                    <a href={activePreview.url} download>
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
            ) : resolvedKind === "image" ? (
              <div className="flex h-full items-center justify-center overflow-auto rounded-lg border border-primary/20 bg-white p-3">
                <img
                  key={activePreview.path}
                  src={activePreview.url}
                  alt={activePreview.name}
                  className="max-h-full max-w-full rounded object-contain"
                />
              </div>
            ) : (
              <iframe
                key={activePreview.path}
                src={activePreviewUrl}
                title={`Document preview for ${activePreview.name}`}
                className="h-full w-full rounded-lg border border-primary/20 bg-white"
                onError={() => {
                  if (resolvedKind === "office") {
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

      {/* Right content */}
      <div className="flex h-full min-w-0 w-full flex-col lg:w-[40vw] lg:min-w-[420px] xl:w-[36vw]">
        {/* Detail header */}
        <div className="border-b border-primary/15 bg-white px-6 py-5">
          <SheetHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={nom.status} />
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                {nom.categoryName ?? nom.categoryId}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {totalFiles} file{totalFiles !== 1 ? "s" : ""}
              </Badge>
            </div>
            <SheetTitle className="font-serif text-2xl text-left">{nom.nomineeName}</SheetTitle>
            <SheetDescription className="text-left text-sm text-muted-foreground">
              {nom.nomineeEmail} · #{nom.studentNumber}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-gold text-primary-foreground"
              onClick={() => {
                if (previewableFiles.length > 0) {
                  openPreview(previewableFiles[0].file.path);
                }
              }}
              disabled={previewableFiles.length === 0}
              aria-label="Preview first available document"
            >
              <Eye className="mr-1.5 h-4 w-4" /> Preview File
            </Button>
            <p className="text-xs text-muted-foreground">
              {previewableFiles.length > 0
                ? `${previewableFiles.length} previewable file${previewableFiles.length !== 1 ? "s" : ""} available.`
                : "No previewable file uploaded for this nominee yet. PDF, Word, PowerPoint, and Excel files are supported."}
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Key info grid */}
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
            {nom.isSelfNomination && (
              <span className="mt-1 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                Self-nominated
              </span>
            )}
          </div>

          {/* Answers */}
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
                                  const previewKind = getPreviewKind(
                                    file.name,
                                    file.url,
                                    file.previewPdfUrl,
                                  );
                                  const isPreviewable = previewKind !== null;
                                  return (
                                    <div
                                      key={file.path}
                                      className="flex flex-wrap items-center gap-2 py-1"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isPreviewable) {
                                            openPreview(file.path);
                                            return;
                                          }
                                          window.open(file.url, "_blank", "noopener,noreferrer");
                                        }}
                                        className="inline-flex min-w-0 items-center gap-1.5 text-left text-xs text-primary hover:underline"
                                        aria-label={
                                          isPreviewable
                                            ? `Preview file ${file.name}`
                                            : `Open file ${file.name}`
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
                                      {isPreviewable && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2 text-[11px]"
                                          onClick={() => openPreview(file.path)}
                                          aria-label={`Preview file ${file.name}`}
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
        </div>

        {/* Action footer */}
        <div className="flex flex-wrap gap-2 border-t border-primary/15 bg-white px-6 py-4">
          {canManage ? (
            <>
              <Button
                size="sm"
                onClick={() => onUpdate(nom.id, "shortlisted")}
                disabled={nom.status === "shortlisted"}
                className="flex-1 bg-gold text-primary-foreground"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Shortlist
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdate(nom.id, "rejected")}
                disabled={nom.status === "rejected"}
                className="flex-1"
              >
                <XCircle className="mr-1.5 h-4 w-4" /> Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(nom.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Read-only mode: document preview and evidence review are enabled; status changes are
              admin-only.
            </p>
          )}
        </div>
      </div>

      {/* Mobile PDF overlay */}
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
                {activePreview.name}
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
                  onClick={() => goToPreviewFile(-1)}
                  disabled={activePreviewIndex <= 0}
                  aria-label="Previous preview file"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goToPreviewFile(1)}
                  disabled={
                    activePreviewIndex < 0 || activePreviewIndex >= previewableFiles.length - 1
                  }
                  aria-label="Next preview file"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  disabled={activePreviewMeta?.kind !== "pdf" || previewPage <= 1}
                  aria-label="Previous PDF page"
                >
                  Page -
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewPage((p) => p + 1)}
                  disabled={activePreviewMeta?.kind !== "pdf"}
                  aria-label="Next PDF page"
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
                  aria-label="Zoom out PDF"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewZoom((z) => Math.min(220, z + 10))}
                  aria-label="Zoom in PDF"
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
                  aria-label="Reset PDF view"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="border-b border-primary/10 px-3 py-3">
              <label
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                htmlFor="mobile-preview-selector"
              >
                Select document
              </label>
              <select
                id="mobile-preview-selector"
                value={previewPath ?? ""}
                onChange={(e) => openPreview(e.target.value)}
                className="w-full rounded-lg border border-primary/20 bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                disabled={previewableFiles.length === 0}
                aria-label="Select a document to preview"
              >
                {previewableFiles.length === 0 ? (
                  <option value="">No previewable files available</option>
                ) : (
                  previewableFiles.map(({ file, evidenceLabel, kind }, index) => (
                    <option key={file.path} value={file.path}>
                      {index + 1}. {evidenceLabel} - {file.name} ({kind.toUpperCase()})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="min-h-0 flex-1 p-3">
              {runtimeConvertingPath === activePreview.path ? (
                <div className="grid h-full place-items-center rounded-lg border border-dashed border-primary/20 bg-white p-4 text-center">
                  <div className="max-w-sm space-y-2">
                    <p className="text-sm font-semibold text-foreground">Converting document…</p>
                    <p className="text-xs text-muted-foreground">
                      Preparing a PDF preview for this Office file. This can take a few seconds.
                    </p>
                  </div>
                </div>
              ) : activePreviewMeta?.kind === "office" && !shouldEmbedOffice && !activePdfUrl ? (
                <div className="grid h-full place-items-center rounded-lg border border-dashed border-amber-300/80 bg-amber-50 p-4 text-center">
                  <div className="max-w-sm space-y-3">
                    <p className="text-sm font-semibold text-amber-900">Preview unavailable</p>
                    <p className="text-xs text-amber-800">
                      {runtimeConversionError
                        ? "Automatic conversion failed and this Office file cannot be embedded here. Open or download the file instead."
                        : "This Office file cannot be embedded in the in-app viewer. Open or download the file instead."}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <a href={activePreview.url} target="_blank" rel="noopener noreferrer">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                        </Button>
                      </a>
                      <a href={activePreview.url} download>
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
                  key={`mobile-${activePreview.path}`}
                  src={activePreviewUrl}
                  title={`Document preview for ${activePreview.name}`}
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
  );
}
