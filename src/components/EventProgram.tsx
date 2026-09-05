import { motion } from "framer-motion";
import { Download, Loader, MapPin, Clock, Accessibility, Car, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { downloadSession1ProgrammePDF, downloadSession2ProgrammePDF } from "@/lib/pdf-download";
import DownloadProgressBar from "@/components/DownloadProgressBar";

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
  { icon: MapPin, label: "Address", value: "47 Botanic Gardens Rd, Musgrave, Berea, 4001" },
  { icon: Car, label: "Parking", value: "Secure on-site · Shuttle from Steve Biko Campus from 17:30" },
  { icon: Accessibility, label: "Access", value: "Step-free access · BSL interpreter on stage" },
  { icon: Shirt, label: "Dress code", value: "Black tie · Traditional attire warmly welcomed" },
];

export default function EventProgram() {
  const [activeSession, setActiveSession] = useState("session1");
  const [downloadingSession, setDownloadingSession] = useState<"session1" | "session2" | null>(null);
  const isMobile = useIsMobile();

  const handleDownloadSession1 = async () => {
    setDownloadingSession("session1");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await downloadSession1ProgrammePDF();
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (error) {
      console.error("Failed to download Session 1 programme PDF:", error);
      alert("Failed to download Session 1 programme. Please try again.");
    } finally {
      setDownloadingSession(null);
    }
  };

  const handleDownloadSession2 = async () => {
    setDownloadingSession("session2");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await downloadSession2ProgrammePDF();
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (error) {
      console.error("Failed to download Session 2 programme PDF:", error);
      alert("Failed to download Session 2 programme. Please try again.");
    } finally {
      setDownloadingSession(null);
    }
  };

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

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="w-full sm:w-auto">
              <Button
                size="lg"
                onClick={handleDownloadSession1}
                disabled={downloadingSession !== null}
                className="h-auto min-h-11 w-full whitespace-normal bg-gold px-5 py-3 text-center text-sm leading-snug text-primary-foreground shadow-gold hover:opacity-95 disabled:opacity-70 sm:w-auto"
              >
                {downloadingSession === "session1" ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader className="mr-2 h-4 w-4 shrink-0" />
                    </motion.div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4 shrink-0" /> Download Session 1 Programme
                  </>
                )}
              </Button>
              {downloadingSession === "session1" && <DownloadProgressBar />}
            </div>
            <div className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                onClick={handleDownloadSession2}
                disabled={downloadingSession !== null}
                className="h-auto min-h-11 w-full whitespace-normal border-primary/30 px-5 py-3 text-center text-sm leading-snug text-foreground hover:bg-accent disabled:opacity-70 sm:w-auto"
              >
                {downloadingSession === "session2" ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader className="mr-2 h-4 w-4 shrink-0" />
                    </motion.div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4 shrink-0" /> Download Session 2 Programme
                  </>
                )}
              </Button>
              {downloadingSession === "session2" && <DownloadProgressBar />}
            </div>
          </div>
        </div>

        {/* Venue card */}
        <div className="lg:col-span-5">
          <div className="sticky top-8 space-y-6 lg:space-y-4">
            <div className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card to-secondary/40">
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                <iframe
                  title="Fred Crookes Sports Centre on OpenStreetMap"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=31.0015,-29.8588,31.0115,-29.8488&layer=mapnik&marker=-29.8538852,31.0065325"
                  className="h-full w-full opacity-90 grayscale"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ border: 0 }}
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
