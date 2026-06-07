import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Menu, Trophy, Calendar, Award, Sparkles, Users, ChevronRight, BookOpen, Play, Download, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
} from "@/components/ui/sheet";
import { subscribeToAuthState } from "@/lib/auth-firebase";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const logo = "/logo.png";
const APP_VERSION = "1.0.0";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Returns true when running as an installed PWA (standalone display mode). */
function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsPWA(mq.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const handler = (e: MediaQueryListEvent) => setIsPWA(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isPWA;
}

export default function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "judge" | "none" | null>(null);
  const isPWA = useIsPWA();

  // PWA install prompt
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<"idle" | "installed" | "unavailable">("idle");

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      installPromptRef.current = e as BeforeInstallPromptEvent;
      setInstallState("idle");
    };
    window.addEventListener("beforeinstallprompt", handler);
    // Already installed?
    window.addEventListener("appinstalled", () => {
      installPromptRef.current = null;
      setInstallState("installed");
    });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const unsub = subscribeToAuthState(async (user) => {
      if (!user) { setUserRole("none"); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.data()?.role;
        setUserRole(role === "admin" || role === "judge" ? role : "none");
      } catch {
        setUserRole("none");
      }
    });
    return unsub;
  }, []);

  const isPrivileged = userRole === "admin" || userRole === "judge";

  async function handleInstall(onFallback?: () => void) {
    if (installPromptRef.current) {
      await installPromptRef.current.prompt();
      const { outcome } = await installPromptRef.current.userChoice;
      if (outcome === "accepted") {
        installPromptRef.current = null;
        setInstallState("installed");
      }
    } else {
      // Prompt unavailable (iOS, already installed, non-HTTPS dev, etc.)
      setInstallState("unavailable");
      setTimeout(() => setInstallState("idle"), 4000);
      onFallback?.();
    }
  }

  const NavLinks = () => (
    <>
      <Link to="/" hash="categories" className="transition hover:text-primary" onClick={() => setIsOpen(false)}>
        Awards
      </Link>
      <Link to="/" hash="event" className="transition hover:text-primary" onClick={() => setIsOpen(false)}>
        Event
      </Link>
      <Link to="/" hash="categories" className="transition hover:text-primary" onClick={() => setIsOpen(false)}>
        Nominate
      </Link>
      <Link to="/winners" className="transition hover:text-primary" activeProps={{ className: "text-primary" }} onClick={() => setIsOpen(false)}>
        Winners
      </Link>
      <Link to="/guide" className="flex items-center gap-1 transition hover:text-primary" activeProps={{ className: "text-primary" }} onClick={() => setIsOpen(false)}>
        <BookOpen className="h-3.5 w-3.5" /> Guide
      </Link>
      {isPrivileged && (
        <Link to="/demo" className="flex items-center gap-1 transition hover:text-primary" activeProps={{ className: "text-primary" }} onClick={() => setIsOpen(false)}>
          <Play className="h-3.5 w-3.5" /> Demo
        </Link>
      )}
      <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/15 hover:border-primary/50" activeProps={{ className: "bg-primary/15 border-primary/50" }} onClick={() => setIsOpen(false)}>
        Admin
      </Link>
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 backdrop-blur-md bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-12 w-auto items-center justify-center overflow-hidden">
            <img src={logo} alt="DUT Logo" className="h-full w-auto object-contain" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-wider text-primary leading-tight">Student Academic &amp; Leadership Excellence Awards</p>
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              SALEA 2026 · Durban University of Technology
            </p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-10 text-sm font-medium text-muted-foreground md:flex">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-4">
          {/* Desktop CTA: "Download App" on browser, "Learn More" inside PWA */}
          {isPWA ? (
            <Link to="/" hash="about" className="hidden sm:flex items-center gap-2">
              <Button className="bg-gold text-primary-foreground hover:opacity-90">
                Learn More
              </Button>
            </Link>
          ) : (
            <div className="relative hidden sm:block">
              <Button
                className="bg-gold text-primary-foreground hover:opacity-90 flex items-center gap-2"
                title={`SALEA 2026 v${APP_VERSION}`}
                onClick={() => handleInstall(() =>
                  document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })
                )}
              >
                {installState === "installed" ? (
                  <><CheckCircle2 className="h-4 w-4" /> Installed!</>
                ) : (
                  <><Download className="h-4 w-4" /> Install App
                    <span className="text-[10px] opacity-70 font-normal ml-1">v{APP_VERSION}</span>
                  </>
                )}
              </Button>
              {installState === "unavailable" && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-primary/20 bg-white shadow-lg p-4 text-xs text-muted-foreground z-50 space-y-2">
                  <p className="font-semibold text-foreground text-sm">Install SALEA 2026</p>
                  <div>
                    <p className="font-medium text-foreground">💻 Desktop (Chrome / Edge)</p>
                    <p>Look for the <strong>install icon ⊕</strong> in the address bar and click it, or open the browser menu → "Install SALEA 2026".</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">🍎 iPhone / iPad</p>
                    <p>Tap the Share button → "Add to Home Screen".</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">🤖 Android</p>
                    <p>Tap ⋮ browser menu → "Add to Home Screen" or "Install app".</p>
                  </div>
                  <p className="text-muted-foreground/60 pt-1 border-t border-primary/10">The app may already be installed — check your Start Menu or home screen.</p>
                </div>
              )}
            </div>
          )}

          {/* Mobile Nav Toggle - Positioned on the RIGHT */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-primary">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85%] sm:w-[400px] border-l border-primary/20 backdrop-blur-xl bg-background/95 flex flex-col overflow-hidden">
                <SheetHeader className="flex flex-row items-center justify-between mb-6 pb-6 border-b border-primary/10 shrink-0">
                  <div className="flex items-center gap-3">
                    <img src={logo} alt="Logo" className="h-10 w-auto" />
                    <div>
                      <p className="font-bold text-sm tracking-tight">DUT AWARDS</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Student Services</p>
                    </div>
                  </div>
                </SheetHeader>
                <nav className="flex flex-col gap-2 flex-1 overflow-y-auto overscroll-contain pb-4">
                  <Link 
                    to="/" 
                    hash="categories" 
                    className="flex items-center gap-4 px-4 py-4 rounded-xl transition hover:bg-primary/5 hover:text-primary group"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-semibold">Awards</span>
                  </Link>

                  <Link 
                    to="/" 
                    hash="event" 
                    className="flex items-center gap-4 px-4 py-4 rounded-xl transition hover:bg-primary/5 hover:text-primary group"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-semibold">Event</span>
                  </Link>

                  <Link 
                    to="/" 
                    hash="categories" 
                    className="flex items-center gap-4 px-4 py-4 rounded-xl transition hover:bg-primary/5 hover:text-primary group"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Award className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-semibold">Nominate</span>
                  </Link>

                  <Link 
                    to="/winners" 
                    className="flex items-center gap-4 px-4 py-4 rounded-xl transition hover:bg-primary/5 hover:text-primary group"
                    activeProps={{ className: "bg-primary/10 text-primary" }}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-semibold">Winners</span>
                  </Link>

                  <Link 
                    to="/guide" 
                    className="flex items-center gap-4 px-4 py-4 rounded-xl transition hover:bg-primary/5 hover:text-primary group"
                    activeProps={{ className: "bg-primary/10 text-primary" }}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-semibold">Guide</span>
                  </Link>

                  {isPrivileged && (
                    <Link 
                      to="/demo" 
                      className="flex items-center gap-4 px-4 py-4 rounded-xl transition hover:bg-primary/5 hover:text-primary group"
                      activeProps={{ className: "bg-primary/10 text-primary" }}
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Play className="h-5 w-5" />
                      </div>
                      <span className="text-lg font-semibold">Demo</span>
                    </Link>
                  )}

                  <Link 
                    to="/admin" 
                    className="flex items-center gap-4 px-4 py-4 rounded-xl transition hover:bg-primary/5 hover:text-primary group"
                    activeProps={{ className: "bg-primary/10 text-primary" }}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-semibold">Admin</span>
                  </Link>

                  <div className="mt-8 pt-8 border-t border-primary/10 space-y-2">
                    {isPWA ? (
                      <Link to="/" hash="about" onClick={() => setIsOpen(false)}>
                        <Button className="w-full h-14 bg-gold text-primary-foreground text-lg font-bold shadow-lg shadow-gold/20 flex items-center justify-center gap-2">
                          Learn More <ChevronRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <button
                          className="w-full h-14 rounded-lg bg-gold text-primary-foreground text-lg font-bold shadow-lg shadow-gold/20 flex items-center justify-center gap-2"
                          onClick={() => {
                            setIsOpen(false);
                            handleInstall();
                          }}
                        >
                          {installState === "installed" ? (
                            <><CheckCircle2 className="h-5 w-5" /> Installed!</>
                          ) : (
                            <><Download className="h-5 w-5" /> Install App
                              <span className="text-xs opacity-70 font-normal">v{APP_VERSION}</span>
                            </>
                          )}
                        </button>
                        {installState === "unavailable" && (
                          <div className="rounded-lg border border-primary/15 bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
                            <p className="font-semibold text-foreground">Install SALEA 2026</p>
                            <p><strong>💻 Desktop:</strong> look for ⊕ in the address bar, or browser menu → "Install SALEA 2026".</p>
                            <p><strong>🍎 iOS:</strong> Share → "Add to Home Screen".</p>
                            <p><strong>🤖 Android:</strong> ⋮ menu → "Install app".</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
