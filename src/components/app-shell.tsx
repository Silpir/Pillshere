import { Link } from "@tanstack/react-router";
import { Pill } from "lucide-react";
import type { ReactNode } from "react";
import { useAppState } from "@/lib/medications/store";
import { isLowSupply } from "@/lib/medications/schedule";
import { Badge } from "@/components/ui/badge";

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      activeOptions={{ exact: to === "/" }}
      activeProps={{ className: "px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-foreground" }}
    >
      {children}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { medications } = useAppState();
  const lowCount = medications.filter((m) => !m.archivedAt && isLowSupply(m)).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Pill className="h-5 w-5 text-primary" />
            <span>MedTrack</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/">Today</NavLink>
            <NavLink to="/meds">
              Meds
              {lowCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">
                  {lowCount}
                </Badge>
              )}
            </NavLink>
            <NavLink to="/history">History</NavLink>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}