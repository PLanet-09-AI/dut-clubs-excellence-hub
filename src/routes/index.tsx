import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Award, Sparkles, Calendar, MapPin, Users, Star, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/SiteNav";
import EventProgram from "@/components/EventProgram";

const AwardScene = lazy(() => import("@/components/AwardScene"));
const BackgroundScene = lazy(() => import("@/components/BackgroundScene"));
const PhotoBackdrop = lazy(() => import("@/components/PhotoBackdrop"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "DUT Student Services Awards 2026 — A Night of Excellence" },
      {
        name: "description",
        content:
          "Celebrate the brightest stars at the Durban University of Technology Student Services Awards — an annual gala honouring leadership, service and excellence.",
      },
      { property: "og:title", content: "DUT Student Services Awards 2026" },
      {
        property: "og:description",
        content: "An annual gala honouring DUT students who lead, serve and inspire.",
      },
    ],
  }),
});

const categories = [
  { icon: Trophy, title: "Student Leader of the Year", desc: "Honouring transformative leadership across SRC, clubs and societies." },
  { icon: Star, title: "Academic Excellence", desc: "Recognising scholars whose intellect lights the path forward." },
  { icon: Users, title: "Community Impact", desc: "Celebrating service that uplifts neighbourhoods and lives." },
  { icon: Award, title: "Sportsperson of the Year", desc: "For athletes who carry the DUT colours with distinction." },
  { icon: Sparkles, title: "Cultural Ambassador", desc: "Voices of art, music and heritage that shape our identity." },
  { icon: Trophy, title: "Residence of the Year", desc: "Where home becomes a community of growth and care." },
];

const stats = [
  { num: "21", label: "Years of Tradition" },
  { num: "30+", label: "Award Categories" },
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

      {/* Nav */}
      <header className="relative z-20 border-b border-primary/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold shadow-gold">
              <span className="font-serif text-lg font-bold text-primary-foreground">D</span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wider text-primary">DUT</p>
              <p className="-mt-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Student Services Awards</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#about" className="transition hover:text-primary">About</a>
            <a href="#categories" className="transition hover:text-primary">Categories</a>
            <a href="#event" className="transition hover:text-primary">The Evening</a>
            <a href="#nominate" className="transition hover:text-primary">Nominate</a>
          </nav>
          <Button variant="default" className="bg-gold text-primary-foreground hover:opacity-90">
            Reserve Seat
          </Button>
        </div>
      </header>

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
              <Sparkles className="h-3 w-3" /> Annual Gala · 21st Edition
            </div>
            <h1 className="text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
              A Night Where <br />
              <span className="text-gradient-gold">Excellence</span> <br />
              Wears a Crown.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              The Durban University of Technology Student Services Awards return — a luminous evening
              dedicated to the students whose courage, scholarship and service define the soul of DUT.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button size="lg" className="bg-gold text-primary-foreground shadow-gold transition hover:scale-[1.02] hover:opacity-95">
                Nominate a Star <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-primary/40 bg-primary/5 text-primary hover:bg-primary/10">
                Watch the 2024 Highlights
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" /> 14 November 2026
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" /> Durban ICC, Hall 3
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 text-primary" /> Black-tie · 19:00
              </div>
            </div>
          </motion.div>

          {/* 3D scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            className="relative h-[460px] sm:h-[560px] lg:h-[640px]"
          >
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-transparent blur-2xl" />
            <Suspense fallback={<div className="grid h-full place-items-center text-primary">Loading…</div>}>
              <AwardScene />
            </Suspense>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
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
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Six pillars. <span className="text-gradient-gold">One legacy.</span></h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-card/60 p-8 backdrop-blur-sm transition hover:border-primary/60 hover:shadow-gold"
              >
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/0 via-transparent to-primary/0 opacity-0 transition group-hover:opacity-100 group-hover:from-primary/10" />
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gold shadow-gold transition group-hover:scale-110">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">{c.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
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
            <Button size="lg" className="bg-gold text-primary-foreground shadow-gold hover:opacity-95">
              Submit Nomination <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-primary/40 bg-primary/5 text-primary hover:bg-primary/10">
              Past Winners
            </Button>
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
