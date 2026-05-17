import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Sparkles, Calendar, MapPin, Users, Trophy, Heart, Briefcase, Home, Globe, GraduationCap, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/SiteNav";
import EventProgram from "@/components/EventProgram";
import { AWARD_CATEGORIES, AWARD_THEME } from "@/data/awards";

const AwardScene = lazy(() => import("@/components/AwardScene"));
const BackgroundScene = lazy(() => import("@/components/BackgroundScene"));
const PhotoBackdrop = lazy(() => import("@/components/PhotoBackdrop"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SALEA 2026 — Student Academic & Leadership Excellence Awards" },
      {
        name: "description",
        content:
          "SALEA 2026: Recognising Excellence. Celebrating Leadership. Inspiring Greatness. Submit nominations for outstanding student leaders and academics.",
      },
      { property: "og:title", content: "SALEA 2026 — Student Academic & Leadership Excellence Awards" },
      {
        property: "og:description",
        content: "Recognising Excellence. Celebrating Leadership. Inspiring Greatness.",
      },
    ],
  }),
});

const CATEGORY_ICONS: Record<string, typeof Award> = {
  dean: Trophy,
  sport: Award,
  wellness: Heart,
  society: Users,
  residence: Home,
  entrepreneur: Briefcase,
  emerging: GraduationCap,
  diversity: Globe,
};

const stats = [
  { num: "1", label: "Premier Awards Event" },
  { num: "8", label: "Award Categories" },
  { num: "2026", label: "Year of Excellence" },
  { num: "∞", label: "Inspired Futures" },
];

function Index() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-hero text-foreground">
      {/* Ambient 3D background */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-70">
        <Suspense fallback={null}>
          <BackgroundScene />
        </Suspense>
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,oklch(0.92_0.03_250/0.3)_70%,oklch(0.90_0.04_260)_100%)]" />

      <SiteNav />

      {/* Hero */}
      <section className="relative z-10 pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 pt-12 pb-24 lg:grid-cols-2 lg:pt-20 lg:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-primary">
              <Sparkles className="h-3 w-3" /> {AWARD_THEME.yearsBadge}
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] sm:text-6xl lg:text-7xl">
              <span className="text-gradient-gold">SALEA 2026</span> <br />
              Student Academic &amp; <br className="hidden sm:block" />
              Leadership Excellence.
            </h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
              Recognising Excellence. Celebrating Leadership. Inspiring Greatness. 
              Nominate outstanding students who exemplify academic achievement, inspiring leadership, and exceptional character.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 lg:hidden">
               <Link to="/" hash="categories">
                <Button className="w-full sm:w-auto h-12 bg-gold text-primary-foreground px-8">Nominate Now</Button>
               </Link>
               <Link to="/winners">
                <Button variant="outline" className="w-full sm:w-auto h-12 border-primary/20">View Winners</Button>
               </Link>
            </div>



            <div className="mt-12 grid gap-3 text-sm sm:grid-cols-2">
              <InfoChip icon={Calendar} title="Recognition Period" value={AWARD_THEME.recognitionPeriod} />
              <InfoChip icon={Sparkles} title="Nominations Close" value={AWARD_THEME.closingDate} />
              <InfoChip icon={MapPin} title="Venue" value="Durban ICC · Hall 3" />
              <InfoChip icon={Users} title="Dress · Time" value="Black-tie · 19:00" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            className="relative h-[460px] sm:h-[560px] lg:h-[640px] order-last lg:order-none"
          >
            <Suspense fallback={null}>
              <PhotoBackdrop />
            </Suspense>
            <Suspense fallback={<div className="grid h-full place-items-center text-primary">Loading…</div>}>
              <AwardScene />
            </Suspense>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent rounded-b-[2rem]" />
          </motion.div>
        </div>

        {/* Marquee */}
        <div className="relative overflow-hidden border-y border-primary/20 bg-primary/5 py-6">
          <div className="flex animate-[shimmer-text_24s_linear_infinite] gap-16 whitespace-nowrap font-serif text-3xl text-black">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}>EXCELLENCE · LEADERSHIP · SERVICE · COURAGE · LEGACY · DUT 2026 · </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card p-8 text-center"
            >
              <p className="text-gradient-gold font-serif text-5xl font-bold">{s.num}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">About SALEA 2026</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              Recognising <span className="text-gradient-gold">academic excellence</span> and leadership.
            </h2>
          </div>
          <div className="space-y-6 text-muted-foreground lg:col-span-7">
            <p className="text-lg leading-relaxed">
              The Student Academic &amp; Leadership Excellence Awards (SALEA) recognise the outstanding achievements of individuals and teams of
              students whose academic excellence, leadership and character demonstrate the highest standards of achievement and integrity.
              SALEA 2026 celebrates students who embody our mission:
              <span className="text-foreground"> Recognising Excellence. Celebrating Leadership. Inspiring Greatness.</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { t: "Nominee", d: "A student or group put forward in recognition of their contributions." },
                { t: "Nominator", d: "The person — peer, staff or self — who submits the nomination." },
                { t: "Self-nomination", d: "Permitted and encouraged when supported by a credible Portfolio of Evidence." },
              ].map((d) => (
                <div key={d.t} className="rounded-xl border border-primary/20 bg-card/40 p-4">
                  <p className="text-xs uppercase tracking-wider text-primary">{d.t}</p>
                  <p className="mt-1 text-sm text-foreground/80">{d.d}</p>
                </div>
              ))}
            </div>
            <p className="leading-relaxed">
              SALEA 2026 — <span className="text-foreground">"{AWARD_THEME.title}: {AWARD_THEME.subtitle}"</span> —
              honours students who exemplify academic excellence and inspiring leadership across the Durban University of Technology.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="mb-14 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Eight Categories</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
            Celebrating <span className="text-gradient-gold">student excellence.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Each category recognises outstanding achievement in a distinct area of student life.
            Read the criteria and nominate an exceptional student today.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {AWARD_CATEGORIES.map((c, i) => {
            const Icon = CATEGORY_ICONS[c.id] ?? Award;
            const isExpanded = expandedId === c.id;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm transition cursor-pointer ${
                  isExpanded
                    ? "border-primary/60 shadow-gold"
                    : "border-primary/20 hover:border-primary/50 hover:shadow-gold"
                }`}
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/30" />

                {/* Card header */}
                <div className="relative flex flex-1 flex-col p-6">
                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold shadow-gold transition group-hover:scale-110">
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-1"
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </div>
                  <h3 className="text-xl font-bold leading-snug">{c.name}</h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">{c.tagline}</p>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="border-t border-primary/20 bg-primary/5 px-6 py-4">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                          Full Criteria
                        </p>
                        <ul className="space-y-2 text-xs text-foreground/80">
                          {c.recognises.map((r) => (
                            <li key={r} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                              {r}
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ to: "/nominate/$categoryId", params: { categoryId: c.id } });
                          }}
                          className="mt-4 w-full rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold transition hover:opacity-90 active:scale-95"
                        >
                          Nominate for this Award
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>


      </section>

      {/* Event details */}
      <section id="event" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-secondary/40 p-10 sm:p-16">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-chart-2/20 blur-3xl" />

          <div className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary">The Gala Evening</p>
              <h2 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
                Celebrating <span className="text-gradient-gold">academic excellence</span> and leadership.
              </h2>
              <p className="mt-6 leading-relaxed text-muted-foreground">
                Join us for an elegant evening honouring the brightest students. Doors open at 18:00 with a reception, 
                followed by the awards ceremony at 19:00, featuring performances, recognition of excellence, 
                and an evening of celebration of student achievement.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                {[
                  ["18:00", "Sparkling Reception"],
                  ["19:00", "Ceremony Begins"],
                  ["20:30", "Banquet & Performances"],
                  ["22:00", "After-party"],
                ].map(([t, l]) => (
                  <div key={t} className="rounded-xl border border-primary/20 bg-background/40 p-4">
                    <p className="text-gradient-gold font-serif text-2xl font-bold">{t}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 animate-float rounded-3xl bg-gold opacity-20 blur-3xl" />
              <div className="relative rounded-3xl border border-primary/40 bg-background/60 p-8 backdrop-blur-md">
                <Trophy className="mb-4 h-10 w-10 text-primary" />
                <p className="font-serif text-3xl font-bold leading-tight">
                  "Recognising Excellence. Celebrating Leadership. Inspiring Greatness."
                </p>
                <p className="mt-6 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  — SALEA 2026 Mission
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Programme & Venue */}
      <EventProgram />



      <footer className="relative z-10 border-t border-primary/10 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>© 2026 SALEA — Student Academic &amp; Leadership Excellence Awards</p>
          <p>Recognising Excellence · Celebrating Leadership · Inspiring Greatness</p>
        </div>
      </footer>
    </div>
  );
}

function InfoChip({ icon: Icon, title, value }: { icon: typeof Award; title: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/15 bg-background/30 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-xs uppercase tracking-wider text-primary">{title}</p>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  );
}
