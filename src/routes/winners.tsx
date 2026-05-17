import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Trophy, Star, Quote, GraduationCap, School } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { PAST_WINNERS } from "@/data/awards";

export const Route = createFileRoute("/winners")({
  component: WinnersPage,
  head: () => ({
    meta: [
      { title: "Past Winners — SALEA" },
      { name: "description", content: "Celebrating the legacy of excellence. View our past award winners." },
    ],
  }),
});

function WinnersPage() {
  // Group by year
  const years = Array.from(new Set(PAST_WINNERS.map((w) => w.year))).sort((a, b) => b - a);

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

        <div className="space-y-24">
          {years.map((year) => (
            <section key={year} className="relative">
              <div className="mb-10 flex items-center gap-4">
                <h2 className="font-serif text-5xl font-bold opacity-20">{year}</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {PAST_WINNERS.filter((w) => w.year === year).map((winner, idx) => (
                  <motion.div
                    key={`${year}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-primary/10 bg-card/40 p-6 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-gold"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-primary">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <Star className="h-4 w-4 text-gold/40" />
                    </div>

                    <h3 className="text-xl font-bold">{winner.name}</h3>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {winner.category}
                    </p>

                    <div className="mt-4 space-y-2">
                       <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <School className="h-3 w-3" />
                        {winner.faculty}
                      </div>
                    </div>

                    {winner.quote && (
                      <div className="mt-6 border-t border-primary/5 pt-4">
                        <div className="flex gap-2">
                          <Quote className="h-4 w-4 shrink-0 text-gold/40" />
                          <p className="text-sm italic text-muted-foreground">
                            {winner.quote}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>
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
