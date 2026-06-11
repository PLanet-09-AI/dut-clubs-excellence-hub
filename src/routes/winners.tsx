import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Quote, School, GraduationCap, X, ChevronLeft, ChevronRight } from "lucide-react";
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

function WinnerModal({ winner, onClose }: { winner: PastWinner; onClose: () => void }) {
  const tier = TIER_STYLES[winner.tier ?? "standard"];
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`relative w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl ${tier.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Photo */}
          {winner.imageBase64 && (
            <div className="h-64 w-full overflow-hidden">
              <img
                src={winner.imageBase64}
                alt={winner.name}
                className="h-full w-full object-cover object-top"
              />
            </div>
          )}

          <div className="p-6">
            {/* Tier badge + trophy */}
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm ${tier.icon}`}>
                <Trophy className="h-5 w-5" />
              </div>
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${tier.badge}`}>
                {tier.label}
              </span>
            </div>

            <h2 className="text-xl font-bold leading-snug">{winner.name}</h2>
            <p className="mt-1 text-sm font-semibold text-primary">{winner.categoryName}</p>

            <div className="mt-3 space-y-2">
              {winner.faculty && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <School className="h-4 w-4 shrink-0" />
                  {winner.faculty}
                </div>
              )}
              {winner.programme && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GraduationCap className="h-4 w-4 shrink-0" />
                  {winner.programme}
                </div>
              )}
            </div>

            {winner.quote && (
              <div className="mt-5 rounded-xl border border-primary/10 bg-primary/5 p-4">
                <Quote className="mb-2 h-5 w-5 text-primary/40" />
                <p className="text-base italic leading-relaxed text-foreground">"{winner.quote}"</p>
              </div>
            )}

            {!winner.quote && (
              <p className="mt-5 text-sm text-muted-foreground italic">Class of {winner.year} · {tier.label} Award Recipient</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function WinnerCard({ winner, idx, onClick }: { winner: PastWinner; idx: number; onClick: () => void }) {
  const tier = TIER_STYLES[winner.tier ?? "standard"];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.07 }}
      onClick={onClick}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card/40 backdrop-blur-sm transition-all hover:shadow-gold cursor-pointer ${tier.border}`}
    >
      {/* Photo */}
      {winner.imageBase64 && (
        <div className="h-64 w-full overflow-hidden">
          <img
            src={winner.imageBase64}
            alt={winner.name}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
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

function MobileWinnerCarousel({ winners, onSelect }: { winners: PastWinner[]; onSelect: (w: PastWinner) => void }) {
  const [idx, setIdx] = useState(0);
  if (winners.length === 0) return null;
  const winner = winners[idx];
  return (
    <div className="relative">
      <WinnerCard winner={winner} idx={0} onClick={() => onSelect(winner)} />
      {winners.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={() => setIdx((i) => (i - 1 + winners.length) % winners.length)}
            disabled={idx === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-card text-primary disabled:opacity-30 transition hover:bg-primary/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">{idx + 1} / {winners.length}</span>
          <button
            onClick={() => setIdx((i) => (i + 1) % winners.length)}
            disabled={idx === winners.length - 1}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-card text-primary disabled:opacity-30 transition hover:bg-primary/5"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function WinnersPage() {
  const [winners, setWinners] = useState<PastWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PastWinner | null>(null);

  useEffect(() => {
    const unsub = subscribePastWinners((docs) => {
      setWinners(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  const years = Array.from(new Set(winners.map((w) => w.year))).filter((y) => y >= 2024).sort((a, b) => b - a);

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

                  {/* Mobile: one at a time carousel */}
                  <div className="sm:hidden">
                    <MobileWinnerCarousel winners={yearWinners} onSelect={setSelected} />
                  </div>
                  {/* Desktop: grid */}
                  <div className="hidden sm:grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                    {yearWinners.map((winner, idx) => (
                      <WinnerCard key={winner.id} winner={winner} idx={idx} onClick={() => setSelected(winner)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {selected && <WinnerModal winner={selected} onClose={() => setSelected(null)} />}

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
