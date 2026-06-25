import { motion } from "framer-motion";
import { Download, MapPin, Clock, Accessibility, Car, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const programSchedule = [
  { time: "18:00", title: "Sparkling Reception", desc: "Foyer · Champagne, canapés, photo wall" },
  { time: "18:45", title: "Guests Seated", desc: "Hall 3 · Ushers will guide you" },
  { time: "19:00", title: "Welcome & Opening Address", desc: "Vice-Chancellor's remarks" },
  { time: "19:15", title: "Cultural Opening — DUT Choir", desc: "Performance of the institutional anthem" },
  { time: "19:30", title: "Awards: Academic Excellence", desc: "Honouring scholarly achievement" },
  { time: "19:55", title: "Awards: Community Impact", desc: "For service that uplifts our communities" },
  { time: "20:20", title: "Three-Course Banquet", desc: "Plated dinner with wine pairing" },
  { time: "21:15", title: "Awards: Leadership & Cultural", desc: "SRC, clubs, residences and ambassadors" },
  { time: "21:50", title: "Sportsperson of the Year", desc: "Headline award presentation" },
  { time: "22:10", title: "Closing Address & Toast", desc: "A salute to all nominees" },
  { time: "22:30", title: "After-Party & Dancing", desc: "Live DJ until midnight" },
];

const venueFacts = [
  { icon: MapPin, label: "Address", value: "45 Bram Fischer Road, Durban Central, 4001" },
  { icon: Car, label: "Parking", value: "Secure on-site · Shuttle from Steve Biko Campus from 17:30" },
  { icon: Accessibility, label: "Access", value: "Step-free access · BSL interpreter on stage" },
  { icon: Shirt, label: "Dress code", value: "Black tie · Traditional attire warmly welcomed" },
];

const downloadFullProgramme = () => {
  const content = `DURBAN UNIVERSITY OF TECHNOLOGY · STUDENT SERVICES
Student Services Awards 2026
A Night Where Excellence Wears a Crown · 21st Annual Gala

DATE: 14 NOVEMBER 2026
VENUE: DURBAN ICC, HALL 3 (Main entrance via Walnut Road)
DRESS: BLACK TIE
ARRIVAL: 18:00

PROGRAMME OF THE EVENING
===============================================
${programSchedule.map(s => `${s.time.padEnd(5)} — ${s.title}\n         ${s.desc}`).join('\n\n')}

VENUE DETAILS
===============================================
DURBAN ICC
45 Bram Fischer Road
Durban Central, 4001

Secure parking available
Shuttle service from DUT Steve Biko Campus from 17:30
Accessibility: step-free access, BSL interpreter on stage

© 2026 Durban University of Technology
Office of Student Services
info@dut.ac.za · +27 31 373 2000
`;
  
  const element = document.createElement('a');
  element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
  element.setAttribute('download', 'SALEA-2026-Programme.txt');
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export default function EventProgram() {
  const isMobile = useIsMobile();

  return (
    <section id="program" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
      <div className="mb-14 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Programme of the Evening</p>
        <h2 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
          Every minute, <span className="text-gradient-gold">choreographed for awe.</span>
        </h2>
        <p className="mt-5 text-muted-foreground">
          A Night Where Excellence Wears a Crown · Join us for SALEA 2026, celebrating 21 years of Student Academic & Leadership Excellence at DUT.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Timeline */}
        <div className="lg:col-span-7">
          <div className="relative rounded-3xl border border-primary/20 bg-card/50 p-8 backdrop-blur-sm">
            <div className="absolute left-[6.5rem] top-8 bottom-8 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent" />
            <ol className="space-y-5">
              {programSchedule.map((s, idx) => (
                <motion.li
                  key={s.time}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: idx * 0.04, duration: 0.5 }}
                  className="relative flex items-start gap-6"
                >
                  <div className="w-20 shrink-0 pt-0.5 text-right font-serif text-lg font-bold text-gradient-gold">
                    {s.time}
                  </div>
                  <div className="relative z-10 mt-2 h-3 w-3 shrink-0 rounded-full bg-gold shadow-[0_0_0_4px_oklch(0.18_0.06_265)]" />
                  <div className="flex-1 pb-1">
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              downloadFullProgramme();
            }}
            className="mt-6 inline-block"
          >
            <Button size="lg" className="bg-gold text-primary-foreground shadow-gold hover:opacity-95">
              <Download className="mr-2 h-4 w-4" /> Download Full Programme
            </Button>
          </a>
        </div>

        {/* Venue card */}
        <div className="lg:col-span-5">
          <div className="sticky top-8 space-y-6">
            <div className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card to-secondary/40">
              <div className="relative aspect-[4/3] overflow-hidden">
                <iframe
                  title="Durban ICC map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=31.015%2C-29.865%2C31.035%2C-29.855&layer=mapnik&marker=-29.860%2C31.025"
                  className="h-full w-full opacity-90 grayscale"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-primary">The Venue</p>
                <h3 className="mt-2 font-serif text-3xl font-bold">Durban ICC, Hall 3</h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  Arrival 18:00 · Welcome Reception at 18:00
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-primary/20 bg-card/40 p-6 backdrop-blur-sm">
              <ul className="space-y-4">
                {venueFacts.map((f) => {
                  const Icon = f.icon;
                  return (
                    <li key={f.label} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-primary">{f.label}</p>
                        <p className="mt-0.5 text-sm text-foreground">{f.value}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
