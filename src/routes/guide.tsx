// /guide — Role-based tutorial page for Admin and Judge users
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Star,
  Trophy,
  FileText,
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Play,
  ArrowRight,
  Filter,
  Download,
  Eye,
  MessageSquare,
  BarChart3,
  Lock,
  ClipboardList,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guide")({
  component: GuidePage,
  head: () => ({
    meta: [
      { title: "Guide · SALEA 2026" },
      { name: "description", content: "Role-based guide for Admin and Judge users." },
    ],
  }),
});

// ─── Collapsible step ────────────────────────────────────────────────────────
function Step({
  number,
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  number: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-primary/15 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-muted/30"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-primary-foreground text-sm font-bold shadow-gold">
          {number}
        </div>
        <Icon className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1 font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-primary/10 px-5 pb-5 pt-4 text-sm text-muted-foreground leading-relaxed space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tip box ─────────────────────────────────────────────────────────────────
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
function GuidePage() {
  const [activeRole, setActiveRole] = useState<"admin" | "judge">("judge");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gray-50 text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.02_260)_0%,transparent_60%)]" />
      <SiteNav />

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              SALEA 2026 · User Guide
            </p>
          </div>
          <h1 className="font-serif text-4xl font-bold sm:text-5xl">
            How it <span className="text-gradient-gold">works</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Step-by-step guide for each role in the SALEA 2026 platform. Choose your role below.
          </p>
        </motion.div>

        {/* Role selector */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          {(
            [
              {
                role: "judge" as const,
                label: "I'm a Judge",
                icon: Star,
                desc: "Rate shortlisted nominations",
              },
              {
                role: "admin" as const,
                label: "I'm an Admin",
                icon: Shield,
                desc: "Manage nominations & judges",
              },
            ] as const
          ).map(({ role, label, icon: Icon, desc }) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition ${
                activeRole === role
                  ? "border-gold bg-gold/10 shadow-md"
                  : "border-primary/20 bg-white hover:border-primary/40"
              }`}
            >
              <div
                className={`grid h-12 w-12 place-items-center rounded-full ${activeRole === role ? "bg-gold text-primary-foreground shadow-gold" : "bg-primary/10 text-primary"}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <p className="font-serif font-bold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeRole === "judge" ? (
            <motion.div
              key="judge"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 space-y-3"
            >
              <div className="mb-6 rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Star className="h-6 w-6 text-yellow-500" />
                  <div>
                    <p className="font-serif text-lg font-bold">Judge Panel</p>
                    <p className="text-xs text-muted-foreground">
                      Your role is to fairly evaluate shortlisted nominees and submit star ratings
                      with written justification.
                    </p>
                  </div>
                </div>
              </div>

              <Step number={1} title="Sign in to the Judge Panel" icon={Lock} defaultOpen>
                <p>
                  Go to <strong>/judge</strong> and sign in with the credentials provided by the
                  SALEA admin team. You need a judge-role account — regular student accounts will
                  not work.
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                  <ChevronRight className="h-4 w-4 text-primary" />
                  <span>
                    After sign-in you will see your <strong>Judge Dashboard</strong> showing
                    shortlisted nominations.
                  </span>
                </div>
                <Tip>
                  If you see "Your account does not have judge access", contact the admin team to
                  have your role set correctly in Firestore.
                </Tip>
              </Step>

              <Step number={2} title="Browse shortlisted nominations" icon={ClipboardList}>
                <p>
                  The dashboard lists all nominations that have been shortlisted by admin. Use the{" "}
                  <strong>search box</strong> to find a nominee by name or student number, or filter
                  by <strong>category</strong> using the dropdown.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      icon: Filter,
                      label: "Filter by category",
                      desc: "Narrow to one award category",
                    },
                    {
                      icon: FileText,
                      label: "Nomination card",
                      desc: 'Click any card to open full details',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start gap-2 rounded-lg border border-primary/10 bg-muted/20 p-3"
                    >
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p>
                  Stats at the top show{" "}
                  <strong className="text-green-700">Scored by me</strong> and{" "}
                  <strong className="text-amber-600">Still to review</strong> — aim to score all
                  assigned nominations before the deadline.
                </p>
              </Step>

              <Step number={3} title="Review a nomination" icon={Eye}>
                <p>
                  Click a nomination card to open the <strong>two-pane detail view</strong>:
                </p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    <strong>Left pane</strong> — Document preview. PDFs and Office files display
                    directly; images show inline. Use the dropdown to switch between uploaded files.
                  </li>
                  <li>
                    <strong>Right pane</strong> — Nominee info, answers to all nomination questions,
                    and your evaluation form.
                  </li>
                </ul>
                <Tip>
                  Use the keyboard shortcut <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd>{" "}
                  to close the mobile document preview overlay.
                </Tip>
              </Step>

              <Step number={4} title="Rate each evaluation criterion" icon={Star}>
                <p>
                  Scroll to the <strong>Your Evaluation</strong> section at the bottom of the right
                  pane. You will see a numbered list of evaluation criteria (placeholder labels until
                  the official questions are confirmed).
                </p>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-yellow-800">
                    How star ratings work:
                  </p>
                  <ul className="space-y-1 text-xs text-yellow-800">
                    {[
                      ["⭐", "Poor — does not meet the criterion"],
                      ["⭐⭐", "Fair — partially meets the criterion"],
                      ["⭐⭐⭐", "Good — meets the criterion"],
                      ["⭐⭐⭐⭐", "Very good — exceeds expectations"],
                      ["⭐⭐⭐⭐⭐", "Exceptional — outstanding performance"],
                    ].map(([stars, label]) => (
                      <li key={label} className="flex gap-2">
                        <span className="shrink-0 font-mono">{stars}</span>
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p>
                  Click to toggle stars (click the same star again to clear the rating). The{" "}
                  <strong>overall score</strong> badge at the top updates live as a weighted average
                  of your per-criterion picks.
                </p>
              </Step>

              <Step number={5} title="Write your comments" icon={MessageSquare}>
                <p>
                  Use the <strong>Judge's Comments</strong> box to write your evaluation reasoning —
                  strengths, weaknesses, context. Up to <strong>1 000 characters</strong>.
                </p>
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  🔒 Comments are <strong>admin-only</strong>. Nominees never see your comments or
                  individual scores.
                </div>
              </Step>

              <Step number={6} title="Submit your evaluation" icon={CheckCircle2}>
                <p>
                  Click <strong>Submit evaluation</strong> once you have rated at least one
                  criterion. The button shows your overall score inline before you click.
                </p>
                <p>
                  You can return and <strong>update</strong> your evaluation at any time before the
                  scoring deadline. The leaderboard reflects your latest submission immediately.
                </p>
                <Tip>
                  Scoring closes on{" "}
                  <strong>15 August 2026</strong>. After that date the form is locked and you
                  cannot edit scores.
                </Tip>
              </Step>

              <Step number={7} title="View the leaderboard" icon={Trophy}>
                <p>
                  Once scoring is open, click <strong>Leaderboard</strong> from the judge dashboard.
                  You will see nominees ranked by <strong>total stars</strong> (sum across all
                  judges) within each category.
                </p>
                <p>
                  Click <strong>"Show per-criterion ratings"</strong> under any nominee to see the
                  breakdown by criterion averaged across all judges.
                </p>
              </Step>

              {/* CTA */}
              <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-6 text-center">
                <Sparkles className="h-8 w-8 text-primary" />
                <p className="font-serif text-lg font-bold">Ready to practice?</p>
                <p className="text-sm text-muted-foreground">
                  Try the demo sandbox — full rating experience with dummy nominees, no real data
                  affected.
                </p>
                <Link to="/demo">
                  <Button className="bg-gold text-primary-foreground gap-2">
                    <Play className="h-4 w-4" /> Open Demo Sandbox
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 space-y-3"
            >
              <div className="mb-6 rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-serif text-lg font-bold">Admin Panel</p>
                    <p className="text-xs text-muted-foreground">
                      Full control over nominations, shortlisting, judge management, and results.
                    </p>
                  </div>
                </div>
              </div>

              <Step number={1} title="Sign in to the Admin Panel" icon={Lock} defaultOpen>
                <p>
                  Go to <strong>/admin</strong> and sign in with your admin credentials. Admin
                  accounts have role <code className="rounded bg-muted px-1 font-mono text-xs">admin</code>{" "}
                  in Firestore under <code className="rounded bg-muted px-1 font-mono text-xs">users/{"{uid}"}</code>.
                </p>
                <Tip>
                  If sign-in succeeds but you see "Access denied", your user document role is not
                  set to <code>admin</code>. Fix it directly in the Firebase console.
                </Tip>
              </Step>

              <Step number={2} title="Review incoming nominations" icon={ClipboardList}>
                <p>
                  The <strong>Nominations</strong> tab shows every public submission in real time.
                  Each card shows name, category, faculty, year, file count, and status badge.
                </p>
                <div className="space-y-2">
                  {[
                    {
                      color: "bg-amber-100 text-amber-700",
                      label: "Pending",
                      desc: "New submission, not yet reviewed",
                    },
                    {
                      color: "bg-green-100 text-green-700",
                      label: "Shortlisted",
                      desc: "Approved for judge scoring",
                    },
                    {
                      color: "bg-red-100 text-red-700",
                      label: "Rejected",
                      desc: "Removed from judge view",
                    },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${s.color}`}>
                        {s.label}
                      </span>
                      <span className="text-muted-foreground">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </Step>

              <Step number={3} title="Shortlist or reject a nomination" icon={Filter}>
                <p>
                  Click any nomination card to open the full detail view. Use the action buttons to:
                </p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    <strong>Shortlist</strong> — nomination becomes visible to all judges for
                    scoring.
                  </li>
                  <li>
                    <strong>Reject</strong> — hidden from judges; remains in admin view with a
                    rejected badge.
                  </li>
                  <li>
                    <strong>Delete</strong> — permanently removed (requires confirmation).
                  </li>
                </ul>
                <Tip>
                  Only shortlisted nominations appear in the judge panel. Shortlist carefully — you
                  can reverse this by changing status again before scoring begins.
                </Tip>
              </Step>

              <Step number={4} title="Use filters & search" icon={Filter}>
                <p>
                  Use the <strong>category chips</strong>, <strong>status filter</strong> tabs, and
                  the <strong>search box</strong> (name / student number / nominator) to find
                  specific submissions quickly.
                </p>
                <p>
                  The <strong>Self-nominated</strong> stat card is clickable — toggle it to isolate
                  self-nominations for separate review.
                </p>
              </Step>

              <Step number={5} title="Preview uploaded documents" icon={Eye}>
                <p>
                  Inside the nomination detail, the <strong>left pane</strong> previews uploaded
                  evidence:
                </p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>PDF files render directly in the iframe.</li>
                  <li>DOCX / PPTX / XLSX are converted to PDF via the serverless function.</li>
                  <li>Images (JPG, PNG, etc.) display inline.</li>
                </ul>
                <Tip>
                  Office file conversion takes a few seconds — a "Converting document…" state shows
                  while it runs. If conversion fails, use the Open / Download fallback buttons.
                </Tip>
              </Step>

              <Step number={6} title="Export shortlisted nominations" icon={Download}>
                <p>
                  Click <strong>Export shortlisted</strong> at the top of the admin panel. A CSV
                  file downloads with all shortlisted nominations, their answers, and metadata — one
                  row per nomination.
                </p>
              </Step>

              <Step number={7} title="Monitor judge scoring" icon={BarChart3}>
                <p>
                  Switch to the <strong>Judge Activity</strong> tab to see every submitted judge
                  evaluation in real time — name, category, star score, timestamp, and written
                  comments.
                </p>
                <p>
                  Comments appear in a blue box under each entry. Use these to validate that judges
                  are providing quality, reasoned assessments.
                </p>
              </Step>

              <Step number={8} title="View the leaderboard" icon={Trophy}>
                <p>
                  Navigate to <strong>/leaderboard</strong> (admin-access only). Nominees are ranked
                  by total stars from all judges. The per-criterion breakdown is collapsible under
                  each nominee.
                </p>
              </Step>

              <Step number={9} title="Manage categories" icon={Users}>
                <p>
                  The <strong>Categories</strong> tab lets you add custom award categories to
                  Firestore. These appear alongside the eight built-in categories on the nomination
                  form.
                </p>
              </Step>

              {/* CTA */}
              <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-6 text-center">
                <Sparkles className="h-8 w-8 text-primary" />
                <p className="font-serif text-lg font-bold">Try the demo sandbox</p>
                <p className="text-sm text-muted-foreground">
                  Practice the judge rating flow with dummy data — nothing is written to the
                  database.
                </p>
                <Link to="/demo">
                  <Button className="bg-gold text-primary-foreground gap-2">
                    <Play className="h-4 w-4" /> Open Demo Sandbox
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
