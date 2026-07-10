import { Link } from "@tanstack/react-router";
import { Pill } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAppState } from "@/lib/medications/store";
import { isLowSupply } from "@/lib/medications/schedule";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { clearAndroidInteractionLocks, isCapacitorAndroid } from "@/lib/platform";

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const [android, setAndroid] = useState(false);

  useEffect(() => {
    setAndroid(isCapacitorAndroid());
  }, []);

  if (android) {
    const href = `#${to}`;
    const active = window.location.hash === href || (to === "/" && (window.location.hash === "" || window.location.hash === "#/"));
    return (
      <a
        href={href}
        className={active ? "px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-foreground" : "px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"}
        onPointerDown={clearAndroidInteractionLocks}
        onTouchStart={clearAndroidInteractionLocks}
        onClick={() => requestAnimationFrame(clearAndroidInteractionLocks)}
      >
        {children}
      </a>
    );
  }

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
      {/* NOTE: `backdrop-blur` + `sticky` locks input & scroll on some Android
       * WebViews (Capacitor). Use an opaque background instead — the visual
       * cost is minimal and the header stays fully interactive on-device. */}
      <header className="android-static-header border-b sticky top-0 z-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Pill className="h-5 w-5 text-primary" />
            <span>Pillshere</span>
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
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}