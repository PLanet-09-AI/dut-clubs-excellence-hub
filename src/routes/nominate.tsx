import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AWARD_CATEGORIES, FACULTIES } from "@/data/awards";
import { addNomination } from "@/lib/nominations";
import { z } from "zod";

export const Route = createFileRoute("/nominate")({
  component: NominatePage,
  head: () => ({
    meta: [
      { title: "Nominate · DUT Student Services Awards 2026" },
      { name: "description", content: "Submit a nomination for the 2026 DUT Student Services Awards. Choose a category, confirm eligibility and put forward an extraordinary student." },
    ],
  }),
});

const schema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  nomineeName: z.string().trim().min(2).max(120),
  nomineeEmail: z.string().trim().email().max(255),
  studentNumber: z.string().trim().regex(/^\d{6,10}$/, "Student number must be 6–10 digits"),
  faculty: z.string().min(1, "Choose a faculty"),
  yearOfStudy: z.string().min(1),
  motivation: z.string().trim().min(80, "Please write at least 80 characters").max(1500),
  nominatorName: z.string().trim().min(2).max(120),
  nominatorEmail: z.string().trim().email().max(255),
});

function NominatePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [categoryId, setCategoryId] = useState("");
  const [eligibility, setEligibility] = useState({ active: false, conduct: false, consent: false });
  const [form, setForm] = useState({
    nomineeName: "", nomineeEmail: "", studentNumber: "", faculty: "", yearOfStudy: "1",
    motivation: "", nominatorName: "", nominatorEmail: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const category = AWARD_CATEGORIES.find((c) => c.id === categoryId);
  const allEligible = eligibility.active && eligibility.conduct && eligibility.consent;

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const result = schema.safeParse({ categoryId, ...form });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path.join(".")] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    addNomination(result.data);
    setSubmitted(true);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-hero">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,oklch(0.25_0.12_265)_0%,transparent_60%)]" />
      <SiteNav />

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-primary">
            <Sparkles className="h-3 w-3" /> Nominations close 30 September 2026
          </div>
          <h1 className="text-4xl font-bold sm:text-5xl">Nominate <span className="text-gradient-gold">a star.</span></h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Three simple steps. Choose a category, confirm the eligibility checks, then tell us their story.
          </p>
        </motion.div>

        {/* Stepper */}
        <div className="mt-10 flex items-center gap-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-3">
              <div className={`grid h-9 w-9 place-items-center rounded-full border text-sm font-bold transition ${
                step >= s ? "border-primary bg-gold text-primary-foreground" : "border-primary/30 text-muted-foreground"
              }`}>{s}</div>
              {s < 3 && <div className={`h-px flex-1 ${step > s ? "bg-primary" : "bg-primary/20"}`} />}
            </div>
          ))}
        </div>

        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mt-10 rounded-3xl border border-primary/30 bg-card/60 p-10 text-center backdrop-blur">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold shadow-gold">
              <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="mt-6 text-3xl font-bold">Nomination received.</h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Thank you. We've recorded the nomination of <span className="text-foreground font-semibold">{form.nomineeName}</span> for the
              {" "}<span className="text-primary font-semibold">{category?.name}</span> category.
              Our panel will be in touch by 15 October.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={() => { setSubmitted(false); setStep(1); setCategoryId(""); setEligibility({active:false,conduct:false,consent:false}); setForm({nomineeName:"",nomineeEmail:"",studentNumber:"",faculty:"",yearOfStudy:"1",motivation:"",nominatorName:"",nominatorEmail:""}); }}
                className="bg-gold text-primary-foreground">Submit another</Button>
              <Link to="/"><Button variant="outline" className="border-primary/40 bg-primary/5 text-primary">Back home</Button></Link>
            </div>
          </motion.div>
        ) : (
          <div className="mt-10 rounded-3xl border border-primary/20 bg-card/50 p-8 backdrop-blur sm:p-10">
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-bold">1. Choose a category</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {AWARD_CATEGORIES.map((c) => (
                    <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        categoryId === c.id ? "border-primary bg-primary/10 shadow-gold" : "border-primary/20 bg-background/40 hover:border-primary/50"
                      }`}>
                      <p className="font-semibold">{c.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{c.eligibility}</p>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button disabled={!categoryId} onClick={() => setStep(2)} className="bg-gold text-primary-foreground">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-bold">2. Eligibility checks</h2>
                {category && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">{category.name}</p>
                    <p className="mt-1 text-muted-foreground">{category.eligibility}</p>
                  </div>
                )}
                <div className="space-y-4">
                  {[
                    ["active", "The nominee is a currently registered DUT student."],
                    ["conduct", "The nominee has no active disciplinary record for the 2025–2026 cycle."],
                    ["consent", "I have the nominee's consent to submit this nomination on their behalf."],
                  ].map(([k, label]) => (
                    <label key={k} className="flex items-start gap-3 rounded-xl border border-primary/20 bg-background/40 p-4 cursor-pointer">
                      <Checkbox checked={eligibility[k as keyof typeof eligibility]}
                        onCheckedChange={(v) => setEligibility((e) => ({ ...e, [k]: Boolean(v) }))} />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
                {!allEligible && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 text-primary" /> Tick all three to continue.
                  </p>
                )}
                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                  <Button disabled={!allEligible} onClick={() => setStep(3)} className="bg-gold text-primary-foreground">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-bold">3. Their story</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nominee full name" err={errors.nomineeName}>
                    <Input value={form.nomineeName} onChange={(e) => update("nomineeName", e.target.value)} maxLength={120} />
                  </Field>
                  <Field label="Nominee email" err={errors.nomineeEmail}>
                    <Input type="email" value={form.nomineeEmail} onChange={(e) => update("nomineeEmail", e.target.value)} maxLength={255} />
                  </Field>
                  <Field label="Student number" err={errors.studentNumber}>
                    <Input value={form.studentNumber} onChange={(e) => update("studentNumber", e.target.value)} maxLength={10} />
                  </Field>
                  <Field label="Faculty" err={errors.faculty}>
                    <Select value={form.faculty} onValueChange={(v) => update("faculty", v)}>
                      <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                      <SelectContent>
                        {FACULTIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Year of study" err={errors.yearOfStudy}>
                    <Select value={form.yearOfStudy} onValueChange={(v) => update("yearOfStudy", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["1","2","3","4","Postgrad"].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Why do they deserve this award? (80–1500 chars)" err={errors.motivation}>
                  <Textarea value={form.motivation} onChange={(e) => update("motivation", e.target.value)} rows={6} maxLength={1500} />
                  <p className="mt-1 text-xs text-muted-foreground">{form.motivation.length} / 1500</p>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Your name" err={errors.nominatorName}>
                    <Input value={form.nominatorName} onChange={(e) => update("nominatorName", e.target.value)} maxLength={120} />
                  </Field>
                  <Field label="Your email" err={errors.nominatorEmail}>
                    <Input type="email" value={form.nominatorEmail} onChange={(e) => update("nominatorEmail", e.target.value)} maxLength={255} />
                  </Field>
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={submit} className="bg-gold text-primary-foreground shadow-gold">
                    Submit nomination
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}
