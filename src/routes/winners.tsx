import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Quote, School, GraduationCap } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { subscribePastWinners, type PastWinner, type WinnerTier } from "@/lib/firestore";

export const Route = createFileRoute("/winners")({
  component: WinnersPage,
  head: () => ({
    meta: [
      { title: "Past Winners — SALEA" },
      { name: "description", content: "Celebrating the legacy of excellence. View our past award winners." },
    ],
  }),
});

const TIER_STYLES: Record<WinnerTier, { label: string; badge: string; border: string; icon: string }> = {
  platinum: {
    label: "Platinum",
    badge: "bg-slate-100 text-slate-700 border border-slate-300",
    border: "border-slate-300/60 hover:border-slate-400/60",
    icon: "text-slate-500",
  },
  gold: {
    label: "Gold",
    badge: "bg-yellow-50 text-yellow-700 border border-yellow-300",
    border: "border-yellow-300/50 hover:border-yellow-400/60",
    icon: "text-yellow-500",
  },
  silver: {
    label: "Silver",
    badge: "bg-zinc-100 text-zinc-600 border border-zinc-300",
    border: "border-zinc-300/50 hover:border-zinc-400/60",
    icon: "text-zinc-400",
  },
  standard: {
    label: "Winner",
    badge: "bg-primary/10 text-primary border border-primary/20",
    border: "border-primary/10 hover:border-primary/40",
    icon: "text-primary",
  },
};

function WinnerCard({ winner, idx }: { winner: PastWinner; idx: number }) {
  const tier = TIER_STYLES[winner.tier ?? "standard"];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.07 }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card/40 backdrop-blur-sm transition-all hover:shadow-gold ${tier.border}`}
    >
      {/* Photo */}
      {winner.imageBase64 && (
        <div className="h-64 w-full overflow-hidden bg-muted/20 flex items-center justify-center">
          <img
            src={winner.imageBase64}
            alt={winner.name}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm ${tier.icon}`}>
            <Trophy className="h-4 w-4" />
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tier.badge}`}>
            {tier.label}
          </span>
        </div>

        <h3 className="text-lg font-bold leading-snug">{winner.name}</h3>
        <p className="mt-1 text-sm font-medium text-primary">{winner.categoryName}</p>

        <div className="mt-3 space-y-1.5">
          {winner.faculty && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <School className="h-3 w-3 shrink-0" />
              {winner.faculty}
            </div>
          )}
          {winner.programme && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GraduationCap className="h-3 w-3 shrink-0" />
              {winner.programme}
            </div>
          )}
        </div>

        {winner.quote && (
          <div className="mt-auto border-t border-primary/5 pt-4">
            <div className="flex gap-2">
              <Quote className="h-4 w-4 shrink-0 text-gold/40" />
              <p className="text-sm italic text-muted-foreground">{winner.quote}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function WinnersPage() {
  const [winners, setWinners] = useState<PastWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribePastWinners((docs) => {
      setWinners(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  const years = Array.from(new Set(winners.map((w) => w.year))).sort((a, b) => b - a);

  return (
    <div className="relative min-h-screen bg-hero text-foreground">
      <SiteNav />

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <header className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Hall of Fame</p>
            <h1 className="mt-4 text-4xl font-bold sm:text-6xl">
              Past <span className="text-gradient-gold">Winners.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Celebrating the legacy of student leaders and academic high-flyers who have
              shaped the culture of excellence at DUT.
            </p>
          </motion.div>
        </header>

        {loading ? (
          <div className="flex justify-center py-32">
            <p className="animate-pulse text-sm text-muted-foreground">Loading winners…</p>
          </div>
        ) : winners.length === 0 ? (
          <div className="flex justify-center py-32">
            <p className="text-sm text-muted-foreground">No winners recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-24">
            {years.map((year) => {
              const yearWinners = winners.filter((w) => w.year === year);
              return (
                <section key={year} className="relative">
                  <div className="mb-10 flex items-center gap-4">
                    <h2 className="font-serif text-5xl font-bold opacity-20">{year}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                    <span className="text-xs text-muted-foreground">{yearWinners.length} winner{yearWinners.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {yearWinners.map((winner, idx) => (
                      <WinnerCard key={winner.id} winner={winner} idx={idx} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-primary/10 bg-background/60 py-12 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <p>© 2026 SALEA — Student Academic &amp; Leadership Excellence Awards</p>
          <div className="flex gap-6">
            <span className="text-primary">#SALEA2026</span>
            <span className="text-primary">#DUTExcellence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
