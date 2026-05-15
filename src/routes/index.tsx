import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Award, Sparkles, Calendar, MapPin, Users, Star, Trophy, ArrowRight, Heart, Leaf, Briefcase, Home, Globe, GraduationCap } from "lucide-react";
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
      { title: "DUT Student Services Awards — ENVISION2030 in Action" },
      {
        name: "description",
        content:
          "Celebrate the brightest stars at the Durban University of Technology Student Services Awards — Leadership, Innovation & Service. Nominations close 31 July 2025.",
      },
      { property: "og:title", content: "DUT Student Services Awards — ENVISION2030 in Action" },
      {
        property: "og:description",
        content: "21 years of honouring DUT students who lead, serve and inspire.",
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
  { num: "21", label: "Years of Tradition" },
  { num: "8", label: "Award Categories" },
  { num: "500+", label: "Nominees Annually" },
  { num: "1", label: "Unforgettable Night" },
];

function Index() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-hero text-foreground">
      {/* Ambient 3D background */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-70">
        <Suspense fallback={null}>
          <BackgroundScene />
        </Suspense>
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,oklch(0.08_0.04_265/0.6)_70%,oklch(0.06_0.04_265)_100%)]" />

      <SiteNav />

      {/* Hero */}
      <section className="relative z-10">
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
            <h1 className="text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
              <span className="text-gradient-gold">ENVISION2030</span> <br />
              in Action: <br />
              Leadership. Innovation. Service.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              The DUT Student Services Awards honour students whose courage, scholarship and service
              bring our ENVISION2030 strategy to life — across leadership, innovation and service.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/nominate">
                <Button size="lg" className="bg-gold text-primary-foreground shadow-gold transition hover:scale-[1.02] hover:opacity-95">
                  Nominate a Star <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/winners">
                <Button size="lg" variant="outline" className="border-primary/40 bg-primary/5 text-primary hover:bg-primary/10">
                  View Past Winners
                </Button>
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
          <div className="flex animate-[shimmer-text_24s_linear_infinite] gap-16 whitespace-nowrap font-serif text-3xl text-primary/70 [background:linear-gradient(90deg,transparent,oklch(0.85_0.17_88),transparent)] [background-size:200%_100%] [-webkit-background-clip:text] [background-clip:text] [color:transparent]">
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
            <p className="text-xs uppercase tracking-[0.3em] text-primary">About the Awards</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              Twenty-one years of <span className="text-gradient-gold">honouring greatness.</span>
            </h2>
          </div>
          <div className="space-y-6 text-muted-foreground lg:col-span-7">
            <p className="text-lg leading-relaxed">
              Each year the Student Services Awards gather the DUT community — students, families,
              faculty and friends — under one roof to celebrate the quiet acts and brilliant
              achievements that shape our institution.
            </p>
            <p className="leading-relaxed">
              From the residence ambassador who stays up late to comfort a homesick first-year, to the
              SRC leader negotiating change, to the athlete who carries our colours abroad — this is
              their night. Held annually since 2004, the gala has become the most anticipated evening
              on the DUT calendar.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="mb-14 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">The Categories</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
            Eight pillars. <span className="text-gradient-gold">One legacy.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Each category honours a distinct dimension of student excellence. Tap a tile to read
            the recognition criteria and start a nomination.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {AWARD_CATEGORIES.map((c, i) => {
            const Icon = CATEGORY_ICONS[c.id] ?? Award;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card/60 p-6 backdrop-blur-sm transition hover:border-primary/60 hover:shadow-gold"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/30" />
                <div className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gold shadow-gold transition group-hover:scale-110">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="relative text-lg font-semibold leading-snug">{c.name}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{c.tagline}</p>
                <ul className="relative mt-4 space-y-1.5 text-xs text-foreground/75">
                  {c.recognises.slice(0, 3).map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold" /> {r}
                    </li>
                  ))}
                </ul>
                <Link to="/nominate" className="relative mt-5 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary hover:text-gold">
                  Nominate <ArrowRight className="h-3 w-3" />
                </Link>
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
              <p className="text-xs uppercase tracking-[0.3em] text-primary">The Evening</p>
              <h2 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
                A red-carpet affair, <span className="text-gradient-gold">tailored for legends.</span>
              </h2>
              <p className="mt-6 leading-relaxed text-muted-foreground">
                Doors open at 18:00 with a sparkling reception in the foyer. The ceremony commences
                at 19:00 sharp, followed by a three-course banquet, live performances from DUT's
                acclaimed cultural ensembles, and dancing into the small hours.
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
                  "To honour a student is to honour the future of a nation."
                </p>
                <p className="mt-6 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  — Office of Student Services
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Programme & Venue */}
      <EventProgram />

      {/* CTA */}
      <section id="nominate" className="relative z-10 mx-auto max-w-5xl px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-4xl font-bold sm:text-6xl">
            Know someone <span className="text-gradient-gold">extraordinary?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Nominations close 30 September 2026. Take a moment to put forward the student
            whose story deserves the spotlight.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/nominate">
              <Button size="lg" className="bg-gold text-primary-foreground shadow-gold hover:opacity-95">
                Submit Nomination <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/winners">
              <Button size="lg" variant="outline" className="border-primary/40 bg-primary/5 text-primary hover:bg-primary/10">
                Past Winners
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-primary/10 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>© 2026 Durban University of Technology · Student Services</p>
          <p>P O Box 1334, Durban 4000 · info@dut.ac.za</p>
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
