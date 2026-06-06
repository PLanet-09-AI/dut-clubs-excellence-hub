import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Menu, X, Trophy, Calendar, Award, Sparkles, Users, ChevronRight, BookOpen, Play } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
} from "@/components/ui/sheet";
const logo = "/logo.png";

export default function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);

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
      <Link to="/demo" className="flex items-center gap-1 transition hover:text-primary" activeProps={{ className: "text-primary" }} onClick={() => setIsOpen(false)}>
        <Play className="h-3.5 w-3.5" /> Demo
      </Link>
      <Link to="/admin" className="transition hover:text-primary" activeProps={{ className: "text-primary" }} onClick={() => setIsOpen(false)}>
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
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/" hash="about" className="hidden sm:block">
            <Button className="bg-gold text-primary-foreground hover:opacity-90">Learn More</Button>
          </Link>

          {/* Mobile Nav Toggle - Positioned on the RIGHT */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-primary">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85%] sm:w-[400px] border-l border-primary/20 backdrop-blur-xl bg-background/95">
                <SheetHeader className="flex flex-row items-center justify-between mb-10 pb-6 border-b border-primary/10">
                  <div className="flex items-center gap-3">
                    <img src={logo} alt="Logo" className="h-10 w-auto" />
                    <div>
                      <p className="font-bold text-sm tracking-tight">DUT AWARDS</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Student Services</p>
                    </div>
                  </div>
                </SheetHeader>
                <nav className="flex flex-col gap-2">
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

                  <div className="mt-8 pt-8 border-t border-primary/10">
                    <Link to="/" hash="about" onClick={() => setIsOpen(false)}>
                      <Button className="w-full h-14 bg-gold text-primary-foreground text-lg font-bold shadow-lg shadow-gold/20 flex items-center justify-center gap-2">
                        Learn More <ChevronRight className="h-5 w-5" />
                      </Button>
                    </Link>
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
