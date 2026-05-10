import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export default function SiteNav() {
  return (
    <header className="relative z-30 border-b border-primary/10 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold shadow-gold">
            <span className="font-serif text-lg font-bold text-primary-foreground">D</span>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wider text-primary">DUT</p>
            <p className="-mt-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Student Services Awards
            </p>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link to="/" hash="program" className="transition hover:text-primary">
            Programme
          </Link>
          <Link to="/winners" className="transition hover:text-primary" activeProps={{ className: "text-primary" }}>
            Winners
          </Link>
          <Link to="/nominate" className="transition hover:text-primary" activeProps={{ className: "text-primary" }}>
            Nominate
          </Link>
          <Link to="/admin" className="transition hover:text-primary" activeProps={{ className: "text-primary" }}>
            Admin
          </Link>
        </nav>
        <Link to="/nominate">
          <Button className="bg-gold text-primary-foreground hover:opacity-90">Nominate</Button>
        </Link>
      </div>
    </header>
  );
}
