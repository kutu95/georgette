import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { type Stats } from "../lib/api";
import { subscribeStats } from "../lib/statsEvents";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/sources", label: "Sources", primary: true, statKey: "sources" as const },
  { to: "/observations", label: "Observations", primary: true, statKey: "observations" as const },
  { to: "/claims", label: "Claims", primary: true, statKey: "claims" as const },
  {
    to: "/ship-features",
    label: "Ship Features",
    primary: true,
    statKey: "shipReconstruction" as const,
  },
  { to: "/evidence", label: "Evidence Explorer", statKey: "evidenceLinks" as const },
  { to: "/people", label: "People", statKey: "people" as const },
  { to: "/places", label: "Places", statKey: "places" as const },
  { to: "/events", label: "Timeline", statKey: "events" as const },
  { to: "/contradictions", label: "Contradictions", statKey: "contradictions" as const },
  { to: "/manuscript-references", label: "Manuscript Refs" },
  { to: "/tags", label: "Tags" },
  { to: "/relationships", label: "Relationships" },
  { to: "/upload-document", label: "Upload Document" },
  { to: "/import", label: "Import" },
];

export function Layout() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [apiOffline, setApiOffline] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const location = useLocation();

  const loadStats = useCallback(() => {
    fetch("/api/stats", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setApiOffline(false);
          setApiError(data.error ?? `API error (${res.status})`);
          return;
        }
        const statsData = data as Stats;
        setStats(statsData);
        setApiOffline(false);
        if (statsData.warnings?.length) {
          setApiError(
            `Some counts could not be loaded (${statsData.warnings.length} issue${statsData.warnings.length === 1 ? "" : "s"}). Data may be partial.`,
          );
        } else {
          setApiError(null);
        }
      })
      .catch(() => {
        setApiOffline(true);
        setApiError(null);
      });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, location.pathname, location.search]);

  useEffect(() => subscribeStats(loadStats), [loadStats]);

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-stone-200 bg-stone-100">
        <div className="border-b border-stone-200 px-4 py-5">
          <h1 className="text-sm font-semibold tracking-wide text-stone-800 uppercase">
            Georgette Research
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Historical claims &amp; ship reconstruction
          </p>
          {stats && (
            <div className="mt-3 space-y-0.5 border-t border-stone-200 pt-3 text-xs text-stone-600">
              <p>
                <strong className="text-stone-800">{stats.sources}</strong> Sources
              </p>
              <p>
                <strong className="text-stone-800">{stats.observations}</strong> Observations
              </p>
              <p>
                <strong className="text-stone-800">{stats.claims}</strong> Claims
              </p>
              <p>
                <strong className="text-stone-800">{stats.shipReconstruction.total}</strong> Ship
                Features
              </p>
              <p>
                <strong className="text-stone-800">{stats.evidenceLinks}</strong> Evidence Links
              </p>
            </div>
          )}
        </div>
        <nav className="p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "mb-0.5 flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-stone-800 text-white"
                    : "text-stone-700 hover:bg-stone-200",
                  item.primary && !isActive ? "font-medium" : "",
                ].join(" ")
              }
            >
              <span>{item.label}</span>
              {stats && item.statKey && (
                <span className="text-xs opacity-70">
                  {item.statKey === "shipReconstruction"
                    ? stats.shipReconstruction.total
                    : stats[item.statKey]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-8">
        {apiOffline && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-medium">API server unavailable</p>
            <p className="mt-1 text-amber-900">
              The backend on port 3001 is not responding. Run{" "}
              <code className="rounded bg-amber-100 px-1">npm run dev</code> (not just the Vite
              client) and check that your database host is reachable.
            </p>
          </div>
        )}
        {apiError && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-medium">API notice</p>
            <p className="mt-1 text-amber-900">{apiError}</p>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
