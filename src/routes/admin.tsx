import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, LogOut, Download, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AWARD_CATEGORIES } from "@/data/awards";
import { exportShortlistedCSV, loadNominations, saveNominations, setStatus, type Nomination } from "@/lib/nominations";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Admin · DUT Student Services Awards" }],
  }),
});

const ADMIN_PIN = "dut2026"; // demo only — replace with real auth when backend is added
const SESSION_KEY = "dut-admin-session";

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1") setAuthed(true);
  }, []);

  function login(e: React.FormEvent) {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setErr("");
    } else {
      setErr("Incorrect access code.");
    }
  }
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setPin("");
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-hero">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,oklch(0.25_0.12_265)_0%,transparent_60%)]" />
      <SiteNav />
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        {!authed ? (
          <div className="mx-auto mt-20 max-w-md rounded-3xl border border-primary/30 bg-card/60 p-10 backdrop-blur">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-gold shadow-gold">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-center font-serif text-3xl font-bold">Admin Panel</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Enter the access code provided by Student Services.
            </p>
            <form onSubmit={login} className="mt-8 space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Access code</Label>
                <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
                {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
              </div>
              <Button type="submit" className="w-full bg-gold text-primary-foreground">Sign in</Button>
              <p className="text-center text-xs text-muted-foreground">Demo code: <span className="font-mono text-primary">dut2026</span></p>
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
  const [categories, setCategories] = useState<{ id: string; name: string; eligibility: string }[]>(
    () => AWARD_CATEGORIES.map((c) => ({ id: c.id, name: c.name, eligibility: c.eligibility }))
  );
  const [newCat, setNewCat] = useState({ name: "", eligibility: "" });

  useEffect(() => { setNominations(loadNominations()); }, []);

  const stats = useMemo(() => ({
    total: nominations.length,
    pending: nominations.filter((n) => n.status === "pending").length,
    shortlisted: nominations.filter((n) => n.status === "shortlisted").length,
    rejected: nominations.filter((n) => n.status === "rejected").length,
  }), [nominations]);

  function update(id: string, status: Nomination["status"]) {
    setNominations(setStatus(id, status));
  }
  function remove(id: string) {
    const next = nominations.filter((n) => n.id !== id);
    setNominations(next);
    saveNominations(next);
  }
  function exportCsv() {
    const csv = exportShortlistedCSV(nominations);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dut-shortlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    setCategories((c) => [...c, { id: crypto.randomUUID(), name: newCat.name.trim(), eligibility: newCat.eligibility.trim() }]);
    setNewCat({ name: "", eligibility: "" });
  }
  function removeCategory(id: string) {
    setCategories((c) => c.filter((x) => x.id !== id));
  }
  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name ?? AWARD_CATEGORIES.find((c) => c.id === id)?.name ?? id;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Admin</p>
          <h1 className="font-serif text-4xl font-bold">Awards Console</h1>
        </div>
        <Button variant="outline" onClick={onLogout} className="border-primary/40 bg-primary/5 text-primary">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Shortlisted" value={stats.shortlisted} accent />
        <Stat label="Rejected" value={stats.rejected} />
      </div>

      <Tabs defaultValue="nominations">
        <TabsList className="bg-card/60">
          <TabsTrigger value="nominations">Nominations</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="nominations" className="mt-6">
          <div className="mb-4 flex justify-end">
            <Button onClick={exportCsv} disabled={stats.shortlisted === 0} className="bg-gold text-primary-foreground">
              <Download className="mr-2 h-4 w-4" /> Export shortlisted ({stats.shortlisted})
            </Button>
          </div>
          {nominations.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              No nominations yet. Submissions from the public form will appear here.
            </Card>
          ) : (
            <div className="space-y-3">
              {nominations.map((n) => (
                <Card key={n.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-primary/40 text-primary">{categoryName(n.categoryId)}</Badge>
                        <StatusBadge status={n.status} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="mt-2 font-serif text-xl font-bold">{n.nomineeName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {n.faculty} · Year {n.yearOfStudy} · #{n.studentNumber} · {n.nomineeEmail}
                      </p>
                      <p className="mt-3 line-clamp-3 text-sm">{n.motivation}</p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Nominated by {n.nominatorName} ({n.nominatorEmail})
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button size="sm" onClick={() => update(n.id, "shortlisted")} className="bg-gold text-primary-foreground">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Shortlist
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => update(n.id, "rejected")}>
                        <XCircle className="mr-1 h-3 w-3" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(n.id)} className="text-destructive">
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-6 space-y-6">
          <Card className="p-6">
            <h3 className="font-serif text-lg font-bold">Add new category</h3>
            <form onSubmit={addCategory} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <Input placeholder="Category name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
              <Input placeholder="Eligibility criteria" value={newCat.eligibility} onChange={(e) => setNewCat({ ...newCat, eligibility: e.target.value })} />
              <Button type="submit" className="bg-gold text-primary-foreground">Add</Button>
            </form>
          </Card>
          <div className="space-y-3">
            {categories.map((c) => (
              <Card key={c.id} className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{c.eligibility}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeCategory(c.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "border-primary/60 bg-primary/10" : ""}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-3xl font-bold ${accent ? "text-gradient-gold" : ""}`}>{value}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: Nomination["status"] }) {
  if (status === "shortlisted") return <Badge className="bg-gold text-primary-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Shortlisted</Badge>;
  if (status === "rejected") return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
  return <Badge variant="outline" className="border-primary/40 text-primary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
}
