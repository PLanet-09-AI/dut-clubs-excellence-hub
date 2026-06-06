// /nominate/$categoryId — Dedicated nomination page, decoupled from homepage
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Home,
  RotateCcw,
  CloudCheck,
  Clock,
} from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AWARD_CATEGORIES, FACULTIES, type AwardCategory } from "@/data/awards";
import { useDraftForm } from "@/hooks/useDraftForm";
import { EvidenceUploader, type UploadedFile, type EvidenceUploads } from "@/components/EvidenceUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SiteNav from "@/components/SiteNav";

// ─── Route definition ────────────────────────────────────────────────────────

export const Route = createFileRoute("/nominate/$categoryId")({
  component: NominatePage,
  head: ({ params }) => {
    const cat = AWARD_CATEGORIES.find((c) => c.id === params.categoryId);
    return {
      meta: [
        { title: cat ? `Nominate · ${cat.name} · SALEA 2026` : "Nominate · SALEA 2026" },
      ],
    };
  },
});

// ─── Constants ───────────────────────────────────────────────────────────────

const YEAR_OPTIONS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Postgraduate / Honours",
  "Masters / Doctoral",
];

const RELATIONSHIP_OPTIONS = [
  "Self-nomination",
  "Peer / Fellow Student",
  "Academic Staff Member",
  "Student Governance / SRC",
  "Residence Staff",
  "Other University Staff",
];

const STEP_LABELS = ["Nominee Details", "Your Details", "Nomination Questions"];

type Step = 1 | 2 | 3;

// ─── Page ────────────────────────────────────────────────────────────────────

function NominatePage() {
  const { categoryId } = Route.useParams();
  const navigate = useNavigate();

  const category = AWARD_CATEGORIES.find((c) => c.id === categoryId);

  if (!category) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p className="text-lg text-muted-foreground">Award category not found.</p>
        <Button onClick={() => navigate({ to: "/", hash: "categories" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Awards
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 text-foreground">
      <SiteNav />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <NominationForm category={category} onBack={() => navigate({ to: "/", hash: "categories" })} />
      </main>
    </div>
  );
}

// ─── Form draft type ──────────────────────────────────────────────────────────

type FormDraft = {
  nominee: { name: string; studentNumber: string; email: string; faculty: string; year: string };
  nominator: { name: string; email: string; relationship: string };
  isSelfNomination: boolean;
  answers: Record<string, string>;
  /** Uploaded evidence files: questionId → slotKey ("e0","e1",…) → files */
  uploads: Record<string, EvidenceUploads>;
  /** Stable ID used as the Firebase Storage path prefix for this submission attempt */
  sessionId: string;
};

// ─── Form draft factory ──────────────────────────────────────────────────────
// Must be a function (not a constant) so each form mount gets a fresh sessionId.
// Using the same sessionId across submissions would cause Storage path collisions.
function makeEmptyDraft(): FormDraft {
  return {
    nominee: { name: "", studentNumber: "", email: "", faculty: "", year: "" },
    nominator: { name: "", email: "", relationship: "" },
    isSelfNomination: false,
    answers: {},
    uploads: {},
    sessionId: crypto.randomUUID(),
  };
}

// ─── Form orchestrator ────────────────────────────────────────────────────────

function NominationForm({ category, onBack }: { category: AwardCategory; onBack: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);

  // Stable per-mount initial draft — fresh sessionId so Storage paths never collide.
  const [initialDraft] = useState<FormDraft>(makeEmptyDraft);

  // Autosave + versioning — scoped per category so drafts don't collide
  const { draft, setDraft, undo, clearDraft, canUndo, snapshotCount, status, lastSaved, hasDraft } =
    useDraftForm<FormDraft>(`salea-draft-${category.id}`, initialDraft);

  const { nominee, nominator, isSelfNomination = false, answers, uploads = {} } = draft;
  // Old drafts (saved before sessionId was added) won't have the field.
  // Fall back to this mount's fresh UUID so the storage path is never "undefined".
  const sessionId = draft.sessionId ?? initialDraft.sessionId;

  // Count total files in a restored draft to surface in the banner
  const restoredFileCount = hasDraft
    ? Object.values(uploads)
        .flatMap((slots) => Object.values(slots))
        .flat().length
    : 0;

  // Group questions by section for display
  const sections = category.questions.reduce<Record<string, typeof category.questions>>(
    (acc, q) => {
      if (!acc[q.section]) acc[q.section] = [];
      acc[q.section].push(q);
      return acc;
    },
    {}
  );

  function validateStep1() {
    return (
      nominee.name.trim() &&
      nominee.studentNumber.trim() &&
      nominee.email.trim() &&
      nominee.faculty &&
      nominee.year
    );
  }

  function validateStep2() {
    return nominator.name.trim() && nominator.email.trim() && nominator.relationship;
  }

  function validateStep3() {
    return category.questions.every((q) => (answers[q.id] ?? "").trim().length > 0);
  }

  function nextStep() {
    setError("");
    if (step === 1 && !validateStep1()) {
      setError("Please complete all fields before continuing.");
      return;
    }
    if (step === 2 && !validateStep2()) {
      setError("Please complete all fields before continuing.");
      return;
    }
    // Skip email-uniqueness check for self-nominations (same person, same email)
    if (
      step === 2 &&
      !isSelfNomination &&
      nominator.email.trim().toLowerCase() === nominee.email.trim().toLowerCase()
    ) {
      setError("Your email address cannot be the same as the nominee's email address.");
      return;
    }
    setStep((s) => (s + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prevStep() {
    setError("");
    setStep((s) => (s - 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setError("");
    if (!validateStep3()) {
      setError("Please answer all questions before submitting.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "nominations"), {
        categoryId: category.id,
        categoryName: category.name,
        nomineeName: nominee.name.trim(),
        nomineeEmail: nominee.email.trim(),
        studentNumber: nominee.studentNumber.trim(),
        faculty: nominee.faculty,
        yearOfStudy: nominee.year,
        nominatorName: nominator.name.trim(),
        nominatorEmail: nominator.email.trim(),
        nominatorRelationship: nominator.relationship,
        isSelfNomination,
        answers,
        uploads,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      clearDraft(); // wipe the saved draft on success
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Submission failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return <SuccessScreen categoryName={category.name} onBack={onBack} />;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Award Categories
      </button>

      {/* Page header — white card */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-8 py-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{category.short ?? category.id}</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-black sm:text-4xl">{category.name}</h1>
        <p className="mt-2 text-gray-500">{category.tagline}</p>
      </div>

      {/* Draft restored banner */}
      {hasDraft && !draftBannerDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm shadow-sm"
        >
          <span className="text-foreground">
            <span className="font-medium">Draft restored.</span>{" "}
            <span className="text-muted-foreground">
              Your previous progress has been loaded
              {restoredFileCount > 0 && (
                <> — including <span className="font-medium text-primary">{restoredFileCount} uploaded {restoredFileCount === 1 ? "file" : "files"}</span></>
              )}.
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { clearDraft(); setDraftBannerDismissed(true); }}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Start fresh
            </button>
            <button
              onClick={() => setDraftBannerDismissed(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Continue ›
            </button>
          </div>
        </motion.div>
      )}

      {/* Step progress — white card */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex gap-4">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-colors duration-300 ${
                  step > s ? "bg-primary" : step === s ? "bg-primary/60" : "bg-gray-200"
                }`}
              />
              <p
                className={`mt-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  step === s ? "text-primary" : step > s ? "text-gray-400" : "text-gray-300"
                }`}
              >
                {STEP_LABELS[s - 1]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Autosave status bar */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-xs text-gray-500 shadow-sm">
        <span className="flex items-center gap-1.5">
          {status === "saving" && (
            <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
          )}
          {status === "saved" && lastSaved && (
            <><CloudCheck className="h-3 w-3 text-primary" /> Draft saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
          )}
          {status === "idle" && !lastSaved && (
            <><Clock className="h-3 w-3" /> Changes autosave as you type</>
          )}
        </span>
        {canUndo && (
          <button
            onClick={undo}
            className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs text-primary transition hover:bg-primary/15"
          >
            <RotateCcw className="h-3 w-3" /> Undo
            {snapshotCount > 1 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] leading-none">
                {snapshotCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepNominee
              key="s1"
              nominee={nominee}
              onChange={(n) => setDraft((prev) => ({ ...prev, nominee: n }))}
            />
          )}
          {step === 2 && (
            <StepNominator
              key="s2"
              nominator={nominator}
              nominee={nominee}
              isSelfNomination={isSelfNomination}
              onSelfNominationChange={(v) => {
                if (v) {
                  // Auto-fill nominator fields from nominee and force relationship
                  setDraft((prev) => ({
                    ...prev,
                    isSelfNomination: true,
                    nominator: {
                      name: prev.nominee.name,
                      email: prev.nominee.email,
                      relationship: "Self-nomination",
                    },
                  }));
                } else {
                  setDraft((prev) => ({ ...prev, isSelfNomination: false }));
                }
              }}
              onChange={(n) => setDraft((prev) => ({ ...prev, nominator: n }))}
            />
          )}
          {step === 3 && (
            <StepQuestions
              key="s3"
              sections={sections}
              answers={answers}
              onAnswersChange={(a) => setDraft((prev) => ({ ...prev, answers: a }))}
              uploads={uploads}
              onUploadsChange={(u) => setDraft((prev) => ({ ...prev, uploads: u }))}
              storagePath={`nominations/${category.id}/${sessionId}`}
            />
          )}
        </AnimatePresence>

        {error && (
          <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={prevStep} disabled={loading} className="border-primary/30">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button onClick={nextStep} className="bg-gold text-primary-foreground">
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={loading} className="bg-gold text-primary-foreground min-w-[180px]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit Nomination"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Nominee Details ──────────────────────────────────────────────────

function StepNominee({
  nominee,
  onChange,
}: {
  nominee: { name: string; studentNumber: string; email: string; faculty: string; year: string };
  onChange: (v: typeof nominee) => void;
}) {
  const set = (k: keyof typeof nominee, v: string) => onChange({ ...nominee, [k]: v });
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      <div>
        <h2 className="font-serif text-xl font-bold">About the Nominee</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about the student you're nominating.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name *">
          <Input
            value={nominee.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Thandeka Mhlongo"
          />
        </Field>
        <Field label="Student Number *">
          <Input
            value={nominee.studentNumber}
            onChange={(e) => set("studentNumber", e.target.value)}
            placeholder="e.g. 21234567"
          />
        </Field>
      </div>
      <Field label="Student Email Address *">
        <Input
          type="email"
          value={nominee.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="e.g. thandeka@dut.ac.za"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Faculty *">
          <Select value={nominee.faculty} onValueChange={(v) => set("faculty", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select faculty" />
            </SelectTrigger>
            <SelectContent>
              {FACULTIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Year of Study *">
          <Select value={nominee.year} onValueChange={(v) => set("year", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </motion.div>
  );
}

// ─── Step 2: Nominator Details ────────────────────────────────────────────────

function StepNominator({
  nominator,
  nominee,
  isSelfNomination,
  onSelfNominationChange,
  onChange,
}: {
  nominator: { name: string; email: string; relationship: string };
  nominee: { name: string; email: string; studentNumber: string; faculty: string; year: string };
  isSelfNomination: boolean;
  onSelfNominationChange: (v: boolean) => void;
  onChange: (v: typeof nominator) => void;
}) {
  const set = (k: keyof typeof nominator, v: string) => onChange({ ...nominator, [k]: v });
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      <div>
        <h2 className="font-serif text-xl font-bold">About You</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about yourself — the person submitting this nomination.
        </p>
      </div>

      {/* Self-nomination checkbox */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Checkbox
          id="self-nom"
          checked={isSelfNomination}
          onCheckedChange={(checked) => onSelfNominationChange(!!checked)}
          className="mt-0.5 shrink-0"
        />
        <div>
          <label htmlFor="self-nom" className="cursor-pointer text-sm font-semibold text-foreground">
            I am nominating myself
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tick this box to auto-fill your details from the nominee information and mark this as a
            self-nomination. Self-nominations are reviewed separately by admin.
          </p>
        </div>
      </div>

      <Field label="Your Full Name *">
        <Input
          value={nominator.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Sipho Dlamini"
          readOnly={isSelfNomination}
          className={isSelfNomination ? "bg-muted/50" : ""}
        />
      </Field>
      <Field label="Your Email Address *">
        <Input
          type="email"
          value={nominator.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="e.g. sipho@dut.ac.za"
          readOnly={isSelfNomination}
          className={isSelfNomination ? "bg-muted/50" : ""}
        />
      </Field>
      <Field label="Your Relationship to the Nominee *">
        <Select
          value={nominator.relationship}
          onValueChange={(v) => set("relationship", v)}
          disabled={isSelfNomination}
        >
          <SelectTrigger className={isSelfNomination ? "bg-muted/50" : ""}>
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {!isSelfNomination && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Self-nominations are welcome.</strong> Tick the
            checkbox above if you are nominating yourself.
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Step 3: Category Questions ───────────────────────────────────────────────

function StepQuestions({
  sections,
  answers,
  onAnswersChange,
  uploads,
  onUploadsChange,
  storagePath,
}: {
  sections: Record<string, { id: string; section: string; prompt: string; wordLimit?: number; evidence?: string[] }[]>;
  answers: Record<string, string>;
  onAnswersChange: (a: Record<string, string>) => void;
  uploads: Record<string, EvidenceUploads>;
  onUploadsChange: (u: Record<string, EvidenceUploads>) => void;
  storagePath: string;
}) {
  function countWords(text: string) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-10"
    >
      <div>
        <h2 className="font-serif text-xl font-bold">Nomination Questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer all questions below. Where a word limit applies, it is shown on the field.
        </p>
      </div>

      {Object.entries(sections).map(([section, questions]) => (
        <div key={section}>
          {/* Section divider */}
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-primary/20" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
              {section}
            </p>
            <div className="h-px flex-1 bg-primary/20" />
          </div>

          <div className="space-y-7">
            {questions.map((q) => {
              const words = countWords(answers[q.id] ?? "");
              const overLimit = q.wordLimit ? words > q.wordLimit : false;
              return (
                <div key={q.id} className="space-y-2">
                  <Label className="text-sm font-medium leading-snug">{q.prompt}</Label>
                  {q.wordLimit && (
                    <p className="text-xs text-muted-foreground">Word limit: {q.wordLimit} words</p>
                  )}
                  <Textarea
                    rows={5}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => onAnswersChange({ ...answers, [q.id]: e.target.value })}
                    className={`resize-none ${overLimit ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    placeholder="Enter your response here…"
                  />
                  {q.wordLimit && (
                    <p
                      className={`text-right text-xs ${overLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}
                    >
                      {words} / {q.wordLimit} words
                    </p>
                  )}
                  {q.evidence && q.evidence.length > 0 && (
                    <EvidenceUploader
                      basePath={`${storagePath}/${q.id}`}
                      evidenceLabels={q.evidence}
                      files={uploads[q.id] ?? {}}
                      onFilesChange={(ev) =>
                        onUploadsChange({ ...uploads, [q.id]: ev })
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ categoryName, onBack }: { categoryName: string; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center py-16 text-center"
    >
      <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-gold shadow-gold">
        <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
      </div>
      <h2 className="font-serif text-3xl font-bold">Nomination Submitted!</h2>
      <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
        Your nomination for the{" "}
        <strong className="text-foreground">{categoryName}</strong> has been received. The Awards
        Committee will review all submissions and contact shortlisted candidates directly.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Thank you for recognising excellence at DUT.
      </p>
      <Button onClick={onBack} className="mt-10 bg-gold text-primary-foreground gap-2">
        <Home className="h-4 w-4" /> Back to Award Categories
      </Button>
    </motion.div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
