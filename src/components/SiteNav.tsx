import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Menu, Trophy, Award, Sparkles, Users, ChevronRight, BookOpen, Play, Download, CheckCircle2, LayoutGrid, Gavel } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

function useScrollDirection() {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 10) { setVisible(true); lastY.current = y; return; }
      setVisible(y < lastY.current);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return visible;
}

const SIDE_NAV_ITEMS = [
  { label: "Nominations", icon: Award, to: "/", hash: "categories" as const },
  { label: "Categories", icon: LayoutGrid, to: "/", hash: "categories" as const },
  { label: "Winners", icon: Sparkles, to: "/winners", hash: undefined },
  { label: "Judge Activity", icon: Gavel, to: "/judge", hash: undefined },
] as const;

export default function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "judge" | "none" | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const isPWA = useIsPWA();
  const headerVisible = useScrollDirection();

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
    window.addEventListener("appinstalled", () => {
      installPromptRef.current = null;
      setInstallState("installed");
    });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const unsub = subscribeToAuthState(async (user) => {
      if (!user) { setUserRole("none"); setIsSignedIn(false); return; }
      setIsSignedIn(true);
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
      setInstallState("unavailable");
      setTimeout(() => setInstallState("idle"), 4000);
      onFallback?.();
    }
  }

  return (
    <>
      {/* ── Top Header (hides on scroll-down, reveals on scroll-up) ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 backdrop-blur-md bg-background/80 transition-transform duration-300"
        style={{ transform: headerVisible ? "translateY(0)" : "translateY(-100%)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:pl-24">
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

          <div className="flex items-center gap-4">
            {/* Install / Learn More CTA */}
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

            {/* Mobile hamburger */}
            <div className="md:hidden">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary">
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
                    {SIDE_NAV_ITEMS.map(({ label, icon: Icon, to, hash }) => (
                      <Link
                        key={label}
                        to={to}
                        {...(hash ? { hash } : {})}
                        className="flex items-center gap-4 px-4 py-4 rounded-xl transition hover:bg-primary/5 hover:text-primary group"
                        activeProps={{ className: "bg-primary/10 text-primary" }}
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-lg font-semibold">{label}</span>
                      </Link>
                    ))}

                    {isSignedIn && (
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
                    )}

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
                            onClick={() => { setIsOpen(false); handleInstall(); }}
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

      {/* ── Left Side Rail (desktop only) ── */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-20 flex-col items-center border-r border-primary/10 bg-background/90 backdrop-blur-md pt-24 pb-6 gap-1">
        <TooltipProvider delayDuration={200}>
          {SIDE_NAV_ITEMS.map(({ label, icon: Icon, to, hash }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Link
                  to={to}
                  {...(hash ? { hash } : {})}
                  className="flex flex-col items-center gap-1 w-14 py-3 rounded-xl text-muted-foreground transition hover:bg-primary/8 hover:text-primary group"
                  activeProps={{ className: "bg-primary/10 text-primary" }}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-tight text-center">{label.split(" ").map((w, i) => <span key={i} className="block">{w}</span>)}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}

          {isSignedIn && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/guide"
                  className="flex flex-col items-center gap-1 w-14 py-3 rounded-xl text-muted-foreground transition hover:bg-primary/8 hover:text-primary"
                  activeProps={{ className: "bg-primary/10 text-primary" }}
                >
                  <BookOpen className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Guide</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Guide</TooltipContent>
            </Tooltip>
          )}

          {isPrivileged && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/demo"
                  className="flex flex-col items-center gap-1 w-14 py-3 rounded-xl text-muted-foreground transition hover:bg-primary/8 hover:text-primary"
                  activeProps={{ className: "bg-primary/10 text-primary" }}
                >
                  <Play className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Demo</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Demo</TooltipContent>
            </Tooltip>
          )}

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/admin"
                className="flex flex-col items-center gap-1 w-14 py-3 rounded-xl text-muted-foreground transition hover:bg-primary/8 hover:text-primary"
                activeProps={{ className: "bg-primary/10 text-primary" }}
              >
                <Users className="h-5 w-5" />
                <span className="text-[10px] font-medium">Admin</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Admin</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </aside>
    </>
  );
}
