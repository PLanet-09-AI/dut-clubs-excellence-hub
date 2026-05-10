import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Quote } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { PAST_WINNERS } from "@/data/awards";

export const Route = createFileRoute("/winners")({
  component: WinnersPage,
  head: () => ({
    meta: [
      { title: "Winners Gallery · DUT Student Services Awards" },
      { name: "description", content: "Browse past winners of the DUT Student Services Awards by year and category — a living archive of excellence." },
    ],
  }),
});

function WinnersPage() {
  const years = useMemo(() => Array.from(new Set(PAST_WINNERS.map((w) => w.year))).sort((a, b) => b - a), []);
  const categories = useMemo(() => ["All", ...Array.from(new Set(PAST_WINNERS.map((w) => w.category)))], []);
  const [year, setYear] = useState<number | "All">("All");
  const [cat, setCat] = useState<string>("All");

  const filtered = PAST_WINNERS.filter((w) => (year === "All" || w.year === year) && (cat === "All" || w.category === cat));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-hero">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,oklch(0.25_0.12_265)_0%,transparent_60%)]" />
      <SiteNav />

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Hall of Honour</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-6xl">
            A living archive of <span className="text-gradient-gold">excellence.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Every name here is a chapter in DUT's story. Browse the past winners of the Student Services Awards by year and category.
          </p>
        </motion.div>

        {/* Filters */}
        <div className="mt-10 flex flex-wrap gap-3">
          <FilterChip active={year === "All"} onClick={() => setYear("All")}>All years</FilterChip>
          {years.map((y) => (
            <FilterChip key={y} active={year === y} onClick={() => setYear(y)}>{y}</FilterChip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                cat === c ? "border-primary bg-primary/15 text-primary" : "border-primary/20 bg-transparent text-muted-foreground hover:border-primary/40"
              }`}>{c}</button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w, i) => (
            <motion.article
              key={`${w.year}-${w.name}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.04 }}
              className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-card/60 p-6 backdrop-blur transition hover:border-primary/60 hover:shadow-gold"
            >
              <div className="absolute right-4 top-4 font-serif text-3xl font-bold text-primary/30">{w.year}</div>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gold shadow-gold transition group-hover:scale-110">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{w.category}</p>
              <h3 className="mt-2 font-serif text-2xl font-bold leading-tight">{w.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{w.faculty}</p>
              <div className="mt-5 flex gap-3 border-t border-primary/10 pt-4">
                <Quote className="h-4 w-4 shrink-0 text-primary/60" />
                <p className="text-sm italic text-muted-foreground">{w.quote}</p>
              </div>
            </motion.article>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-primary/30 p-10 text-center text-muted-foreground">
              No winners match this filter.
            </p>
          )}
        </div>

        <div className="mt-16 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-10 text-center">
          <h2 className="font-serif text-3xl font-bold">Could 2026 be your year?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Nominations are open. Take a moment to put forward someone whose story deserves the spotlight.
          </p>
          <a href="/nominate" className="mt-6 inline-block">
            <Button size="lg" className="bg-gold text-primary-foreground shadow-gold">Submit a nomination</Button>
          </a>
        </div>
      </main>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        active ? "border-primary bg-gold text-primary-foreground shadow-gold" : "border-primary/30 text-muted-foreground hover:border-primary/60"
      }`}>{children}</button>
  );
}
