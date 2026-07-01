import { motion } from "framer-motion";
import { Download, MapPin, Clock, Accessibility, Car, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const session1Schedule = [
  { time: "10:00", title: "Welcome & Opening Address", desc: "Dean's remarks and programme introduction" },
  { time: "10:15", title: "Cultural Opening — DUT Choir", desc: "Performance of the institutional anthem" },
  { time: "10:30", title: "Awards: Academic Excellence", desc: "Honouring scholarly achievement" },
  { time: "11:00", title: "Awards: Community Impact", desc: "For service that uplifts our communities" },
  { time: "11:30", title: "Light Refreshments", desc: "Coffee, tea, and pastries" },
  { time: "12:00", title: "Awards: Emerging Leaders (First Year)", desc: "Recognising first-year excellence" },
  { time: "12:30", title: "Closing & Awards Celebration", desc: "Recognition of all nominees and winners" },
  { time: "13:00", title: "Session Ends", desc: "Thank you and departure" },
];

const session2Schedule = [
  { time: "16:00", title: "Welcome Reception", desc: "Foyer · Champagne, canapés, photo wall" },
  { time: "16:45", title: "Guests Seated", desc: "Main Hall · Ushers will guide you" },
  { time: "17:00", title: "Welcome & Opening Address", desc: "Dean's remarks" },
  { time: "17:15", title: "Cultural Opening — DUT Choir", desc: "Performance of the institutional anthem" },
  { time: "17:30", title: "Awards: Academic Excellence", desc: "Honouring scholarly achievement" },
  { time: "18:00", title: "Awards: Community Impact", desc: "For service that uplifts our communities" },
  { time: "18:30", title: "Three-Course Banquet", desc: "Plated dinner with wine pairing" },
  { time: "19:30", title: "Awards: Leadership & Cultural", desc: "SRC, clubs, residences and ambassadors" },
  { time: "20:10", title: "Sportsperson of the Year", desc: "Headline award presentation" },
  { time: "20:30", title: "Closing Address & Toast", desc: "A salute to all nominees" },
  { time: "21:00", title: "After-Party & Dancing", desc: "Live DJ until 22:00" },
];

const venueFacts = [
  { icon: MapPin, label: "Address", value: "76 Steve Biko Road, Fred Crookes Sports Centre" },
  { icon: Car, label: "Parking", value: "Secure on-site · Shuttle from Steve Biko Campus from 17:30" },
  { icon: Accessibility, label: "Access", value: "Step-free access · BSL interpreter on stage" },
  { icon: Shirt, label: "Dress code", value: "Black tie · Traditional attire warmly welcomed" },
];

const downloadBothSessions = () => {
  const content = `DURBAN UNIVERSITY OF TECHNOLOGY · STUDENT SERVICES
Student Services Awards 2026
A Night Where Excellence Wears a Crown · 21st Annual Gala

DATE: 14 NOVEMBER 2026
VENUE: FRED CROOKES SPORTS CENTRE
DRESS: BLACK TIE

===============================================
SESSION 1: MORNING SESSION (10:00–13:00)
===============================================
${session1Schedule.map(s => `${s.time} — ${s.title}\n         ${s.desc}`).join('\n\n')}

===============================================
SESSION 2: EVENING SESSION (16:00–22:00)
===============================================
${session2Schedule.map(s => `${s.time} — ${s.title}\n         ${s.desc}`).join('\n\n')}

VENUE DETAILS
===============================================
FRED CROOKES SPORTS CENTRE
76 Steve Biko Road
Durban, 4001

Secure parking available
Shuttle service from DUT Steve Biko Campus from 17:30
Accessibility: step-free access, BSL interpreter on stage

© 2026 Durban University of Technology
Office of Student Services
info@dut.ac.za · +27 31 373 2000
`;
  
  const element = document.createElement('a');
  element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
  element.setAttribute('download', 'SALEA-2026-Complete-Programme.txt');
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export default function EventProgram() {
  const [activeSession, setActiveSession] = useState("session1");
  const isMobile = useIsMobile();

  return (
    <section id="program" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
      <div className="mb-14 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Programme of the Evening</p>
        <h2 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
          Every minute, <span className="text-gradient-gold">choreographed for awe.</span>
        </h2>
        <p className="mt-5 text-muted-foreground">
          Judges will attend one of two scheduled sessions. Choose your session and experience the SALEA 2026 awards ceremony tailored to your schedule.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Timeline with session tabs */}
        <div className="lg:col-span-7">
          <Tabs value={activeSession} onValueChange={setActiveSession} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="session1" className="text-sm font-semibold">
                <Clock className="mr-2 h-4 w-4" />
                Session 1: 10:00–13:00
              </TabsTrigger>
              <TabsTrigger value="session2" className="text-sm font-semibold">
                <Clock className="mr-2 h-4 w-4" />
                Session 2: 16:00–22:00
              </TabsTrigger>
            </TabsList>

            <TabsContent value="session1" className="space-y-4">
              <div className="rounded-lg border border-primary/15 bg-blue-50 px-4 py-3">
                <p className="text-sm font-semibold text-primary">Session 1 (10:00–13:00)</p>
                <p className="text-xs text-muted-foreground">Morning session with light refreshments</p>
              </div>
              <div className="relative rounded-3xl border border-primary/20 bg-card/50 p-8 backdrop-blur-sm">
                <div className="absolute left-[6.5rem] top-8 bottom-8 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent" />
                <ol className="space-y-5">
                  {session1Schedule.map((s, idx) => (
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
            </TabsContent>

            <TabsContent value="session2" className="space-y-4">
              <div className="rounded-lg border border-primary/15 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-primary">Session 2 (16:00–22:00)</p>
                <p className="text-xs text-muted-foreground">Evening session with three-course dinner and dancing</p>
              </div>
              <div className="relative rounded-3xl border border-primary/20 bg-card/50 p-8 backdrop-blur-sm">
                <div className="absolute left-[6.5rem] top-8 bottom-8 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent" />
                <ol className="space-y-5">
                  {session2Schedule.map((s, idx) => (
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
            </TabsContent>
          </Tabs>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              downloadBothSessions();
            }}
            className="mt-6 inline-block"
          >
            <Button size="lg" className="bg-gold text-primary-foreground shadow-gold hover:opacity-95">
              <Download className="mr-2 h-4 w-4" /> Download Full Programme (Session 1 & 2)
            </Button>
          </a>
        </div>

        {/* Venue card */}
        <div className="lg:col-span-5">
          <div className="sticky top-8 space-y-6">
            <div className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card to-secondary/40">
              <div className="relative aspect-[4/3] overflow-hidden">
                <iframe
                  title="Fred Crookes Sports Centre map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=31.020%2C-29.877%2C31.030%2C-29.870&layer=mapnik&marker=-29.8734%2C31.0247"
                  className="h-full w-full opacity-90 grayscale"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-primary">The Venue</p>
                <h3 className="mt-2 font-serif text-3xl font-bold">Fred Crookes Sports Centre</h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  Session 1: 10:00–13:00 · Session 2: 16:00–22:00
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
