import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, LogOut, Download, CheckCircle2, XCircle, Clock, Trash2, ChevronDown, FileText, Mail, Search, Filter, X as XIcon } from "lucide-react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { signIn, signOut as firebaseSignOut, subscribeToAuthState, resetPassword, registerUser } from "@/lib/auth-firebase";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
  answers: Record<string, string>;
  uploads?: Record<string, Record<string, { name: string; url: string; size: number; path: string }[]>>;
  status: NominationStatus;
};

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Admin · SALEA 2026 Awards Management" }],
  }),
});

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAuthState((user) => setAuthed(!!user));
    return unsub;
  }, []);

  function switchMode(m: "signin" | "register") {
    setMode(m);
    setErr("");
    setResetSent(false);
    setPassword("");
    setConfirm("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (mode === "register") {
      if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
      if (password !== confirm) { setErr("Passwords do not match."); return; }
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await registerUser(email, password);
      }
    } catch (ex: unknown) {
      const code = (ex as { code?: string }).code ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setErr("Incorrect email or password.");
      } else if (code === "auth/email-already-in-use") {
        setErr("An account with this email already exists. Sign in instead.");
      } else if (code === "auth/weak-password") {
        setErr("Password is too weak. Use at least 8 characters.");
      } else if (code === "auth/too-many-requests") {
        setErr("Too many attempts. Please try again later.");
      } else {
        setErr(mode === "signin" ? "Sign-in failed. Please try again." : "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email) { setErr("Enter your email address first."); return; }
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
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Email address</Label>
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
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                />
              </div>
              {mode === "register" && (
                <div>
                  <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Confirm password</Label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}
              {err && <p className="text-sm text-destructive">{err}</p>}
              {resetSent && <p className="text-sm text-green-600">Password reset email sent — check your inbox.</p>}
              <Button type="submit" disabled={loading} className="w-full bg-gold text-primary-foreground">
                {loading ? (mode === "signin" ? "Signing in…" : "Creating account…") : (mode === "signin" ? "Sign in" : "Create account")}
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
          <Dashboard onLogout={logout} />
        )}
      </main>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<"all" | NominationStatus>("all");
  const [search, setSearch] = useState("");
  const [detailNom, setDetailNom] = useState<Nomination | null>(null);
  const [extraCategories, setExtraCategories] = useState<{ id: string; name: string; tagline: string }[]>([]);
  const [newCat, setNewCat] = useState({ name: "", tagline: "" });

  // All categories = static + admin-added (from Firestore)
  const allCategories = useMemo(() => [
    ...AWARD_CATEGORIES.map((c) => ({ id: c.id, name: c.name, tagline: c.tagline, isStatic: true })),
    ...extraCategories.map((c) => ({ ...c, isStatic: false })),
  ], [extraCategories]);

  // Real-time Firestore listener — nominations
  useEffect(() => {
    const q = query(collection(db, "nominations"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Nomination));
      setNominations(docs);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listener — custom categories
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "admin_categories"), (snap) => {
      setExtraCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; name: string; tagline: string })));
    });
    return () => unsub();
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    const id = `custom_${crypto.randomUUID()}`;
    await setDoc(doc(db, "admin_categories", id), { name: newCat.name.trim(), tagline: newCat.tagline.trim(), createdAt: serverTimestamp() });
    setNewCat({ name: "", tagline: "" });
  }

  async function removeExtraCategory(id: string) {
    if (!confirm("Remove this category? This cannot be undone.")) return;
    await deleteDoc(doc(db, "admin_categories", id));
  }

  const stats = useMemo(() => ({
    total: nominations.length,
    pending: nominations.filter((n) => n.status === "pending").length,
    shortlisted: nominations.filter((n) => n.status === "shortlisted").length,
    rejected: nominations.filter((n) => n.status === "rejected").length,
  }), [nominations]);

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
  }, [nominations, selectedCategory, statusFilter, search]);

  async function update(id: string, status: NominationStatus) {
    await updateDoc(doc(db, "nominations", id), { status, updatedAt: serverTimestamp() });
    // Refresh detail panel if open
    setDetailNom((prev) => prev?.id === id ? { ...prev, status } : prev);
  }

  async function remove(id: string) {
    if (!confirm("Delete this nomination? This cannot be undone.")) return;
    await deleteDoc(doc(db, "nominations", id));
    setDetailNom((prev) => prev?.id === id ? null : prev);
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

    const baseHeaders = ["Category", "Nominee", "Student #", "Faculty", "Year", "Email", "Nominator", "Relationship", "Submitted"];
    // Alternate prompt/answer columns so reviewers see the question beside the answer
    const qHeaders = questionIds.flatMap((id) => [questionMap.get(id) ?? id, `Answer`]);
    const header = [...baseHeaders, ...qHeaders];

    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const csv = [
      header.map(escape).join(","),
      ...rows.map((r) => {
        const date = r.createdAt && typeof r.createdAt === "object" && r.createdAt.toDate
          ? r.createdAt.toDate().toISOString()
          : String(r.createdAt ?? "");
        const base = [r.categoryName ?? r.categoryId, r.nomineeName, r.studentNumber, r.faculty, r.yearOfStudy, r.nomineeEmail, r.nominatorName, r.nominatorRelationship, date];
        const answers = questionIds.flatMap((id) => {
          const catData = AWARD_CATEGORIES.find((c) => c.id === r.categoryId);
          const prompt = catData?.questions.find((q) => q.id === id)?.prompt ?? questionMap.get(id) ?? id;
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
    if (typeof ts === "object" && ts.toDate) return ts.toDate().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
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
          <h1 className="font-serif text-3xl font-bold sm:text-4xl">Administration Panel</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCsv} disabled={stats.shortlisted === 0} variant="outline" className="border-primary/40 text-primary">
            <Download className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Export shortlisted</span> ({stats.shortlisted})
          </Button>
          <Button variant="outline" onClick={onLogout} className="border-primary/40 bg-primary/5 text-primary">
            <LogOut className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} color="amber" />
        <StatCard label="Shortlisted" value={stats.shortlisted} color="gold" />
        <StatCard label="Rejected" value={stats.rejected} color="red" />
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
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {nominations.length} nominations
          {selectedCategory !== "__all__" && <> in <span className="text-primary font-medium">{categoryTiles.find(c => c.id === selectedCategory)?.name}</span></>}
        </p>
      )}

      {/* Tabs: Nominations | Categories */}
      <Tabs defaultValue="nominations">
        <TabsList className="bg-card/60">
          <TabsTrigger value="nominations">Nominations</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
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
                  ? Object.values(n.uploads).flatMap((slots) => Object.values(slots)).flat().length
                  : 0;
                return (
                  <button
                    key={n.id}
                    onClick={() => setDetailNom(n)}
                    className="group text-left rounded-2xl border border-primary/20 bg-white p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <StatusBadge status={n.status} />
                      <span className="text-[11px] text-muted-foreground">{formatDate(n.createdAt)}</span>
                    </div>
                    <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-primary transition-colors">
                      {n.nomineeName}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {n.categoryName ?? n.categoryId}
                    </p>
                    <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                      <p><span className="font-medium text-foreground/70">Student #</span> {n.studentNumber}</p>
                      <p><span className="font-medium text-foreground/70">Faculty</span> {n.faculty}</p>
                      <p><span className="font-medium text-foreground/70">Year</span> {n.yearOfStudy}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground line-clamp-1">By {n.nominatorName}</p>
                      {totalFiles > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary font-medium">
                          <FileText className="h-3 w-3" /> {totalFiles}
                        </span>
                      )}
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

        <TabsContent value="categories" className="mt-6 space-y-6">
          {/* Add custom category form */}
          <Card className="p-6">
            <h3 className="font-serif text-lg font-bold mb-1">Add custom category</h3>
            <p className="text-xs text-muted-foreground mb-4">Custom categories are saved to Firestore and appear on the nomination form alongside the built-in eight.</p>
            <form onSubmit={addCategory} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <Input placeholder="Category name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} required />
              <Input placeholder="Tagline / eligibility summary" value={newCat.tagline} onChange={(e) => setNewCat({ ...newCat, tagline: e.target.value })} />
              <Button type="submit" className="bg-gold text-primary-foreground">Add</Button>
            </form>
          </Card>

          {/* Built-in categories (read-only) */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Built-in categories (8)</p>
            <div className="space-y-2">
              {AWARD_CATEGORIES.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-4 rounded-xl border border-primary/15 bg-white px-5 py-4">
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.tagline}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] border-primary/30 text-primary">Built-in</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Custom / admin-added categories */}
          {extraCategories.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Custom categories ({extraCategories.length})</p>
              <div className="space-y-2">
                {extraCategories.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-4 rounded-xl border border-primary/20 bg-white px-5 py-4">
                    <div>
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.tagline}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeExtraCategory(c.id)} className="text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail slide-over */}
      <Sheet open={!!detailNom} onOpenChange={(open) => { if (!open) setDetailNom(null); }}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto p-0 sm:max-w-xl">
          {detailNom && (
            <NominationDetail
              nom={detailNom}
              onUpdate={update}
              onDelete={remove}
              formatDate={formatDate}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Category chip ─────────────────────────────────────────────────── */
function CategoryChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
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
      <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
        {count}
      </span>
    </button>
  );
}

/* ── Stat card ─────────────────────────────────────────────────────── */
function StatCard({ label, value, color }: { label: string; value: number; color?: "gold" | "amber" | "red" }) {
  const accent =
    color === "gold" ? "border-yellow-400/60 bg-yellow-50" :
    color === "amber" ? "border-orange-300/60 bg-orange-50" :
    color === "red" ? "border-red-300/60 bg-red-50" :
    "";
  const text =
    color === "gold" ? "text-yellow-600" :
    color === "amber" ? "text-orange-500" :
    color === "red" ? "text-red-500" :
    "";
  return (
    <Card className={`p-5 ${accent}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-3xl font-bold ${text || "text-foreground"}`}>{value}</p>
    </Card>
  );
}

/* ── Status badge ──────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: NominationStatus }) {
  if (status === "shortlisted") return <Badge className="bg-gold text-primary-foreground gap-1"><CheckCircle2 className="h-3 w-3" />Shortlisted</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge variant="outline" className="border-orange-300 text-orange-600 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

/* ── Nomination detail panel ───────────────────────────────────────── */
function NominationDetail({
  nom,
  onUpdate,
  onDelete,
  formatDate,
}: {
  nom: Nomination;
  onUpdate: (id: string, s: NominationStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  formatDate: (ts: Nomination["createdAt"]) => string;
}) {
  const catData = AWARD_CATEGORIES.find((c) => c.id === nom.categoryId);
  const totalFiles = nom.uploads
    ? Object.values(nom.uploads).flatMap((slots) => Object.values(slots)).flat().length
    : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Detail header */}
      <div className="border-b border-primary/15 bg-white px-6 py-5">
        <SheetHeader>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={nom.status} />
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
              {nom.categoryName ?? nom.categoryId}
            </Badge>
          </div>
          <SheetTitle className="font-serif text-2xl text-left">{nom.nomineeName}</SheetTitle>
          <SheetDescription className="text-left text-sm text-muted-foreground">
            {nom.nomineeEmail} · #{nom.studentNumber}
          </SheetDescription>
        </SheetHeader>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

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
        <div className="rounded-xl border border-primary/15 bg-gray-50 p-4 space-y-0.5 text-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Nominated by</p>
          <p className="font-semibold">{nom.nominatorName}</p>
          <p className="text-muted-foreground">{nom.nominatorEmail}</p>
          {nom.nominatorRelationship && <p className="text-muted-foreground">{nom.nominatorRelationship}</p>}
        </div>

        {/* Answers */}
        {nom.answers && Object.keys(nom.answers).length > 0 && (
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-primary">Answers &amp; Evidence</p>
            <div className="space-y-4">
              {catData
                ? catData.questions.map((q) =>
                    nom.answers[q.id] || nom.uploads?.[q.id] ? (
                      <div key={q.id} className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">{q.section}</p>
                        <p className="text-xs text-muted-foreground italic mb-2">{q.prompt}</p>
                        {nom.answers[q.id] && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{nom.answers[q.id]}</p>
                        )}
                        {q.evidence?.map((label, idx) => {
                          const slotFiles = nom.uploads?.[q.id]?.[`e${idx}`] ?? [];
                          if (!slotFiles.length) return null;
                          return (
                            <div key={idx} className="mt-3">
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">{label}</p>
                              {slotFiles.map((file) => (
                                <a
                                  key={file.path}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="flex items-center gap-1.5 text-xs text-primary hover:underline py-0.5"
                                >
                                  <FileText className="h-3 w-3 shrink-0" />
                                  {file.name}
                                  <span className="text-[10px] text-muted-foreground ml-1">
                                    ({file.size < 1024 * 1024
                                      ? `${(file.size / 1024).toFixed(0)} KB`
                                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`})
                                  </span>
                                </a>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ) : null
                  )
                : Object.entries(nom.answers).map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{k}</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{v}</p>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="border-t border-primary/15 bg-white px-6 py-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => onUpdate(nom.id, "shortlisted")}
          disabled={nom.status === "shortlisted"}
          className="bg-gold text-primary-foreground flex-1"
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
      </div>
    </div>
  );
}
