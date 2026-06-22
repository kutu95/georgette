import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, type Stats } from "../lib/api";

function StatCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="text-3xl font-semibold text-stone-900">{value}</p>
      <p className="mt-1 text-sm text-stone-600">{label}</p>
    </Link>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-stone-500">Loading dashboard…</p>;
  if (!stats) return <p className="text-sm text-red-700">Could not load dashboard.</p>;

  return (
    <div className="min-w-0">
      <h2 className="text-2xl font-semibold text-stone-900">Research Dashboard</h2>
      <p className="mt-1 text-sm text-stone-600">
        Historical claims and ship reconstruction — trace sources through observations to conclusions.
      </p>

      <section className="mt-8">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">Ship Reconstruction Status</h3>
        <p className="mb-4 text-sm text-stone-600">
          Technical features for visual reconstruction — identify gaps in the evidence chain.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Features"
            value={stats.shipReconstruction.total}
            to="/ship-features"
          />
          <StatCard
            label="Confirmed"
            value={stats.shipReconstruction.confirmed}
            to="/ship-features?status=CONFIRMED"
          />
          <StatCard
            label="Probable"
            value={stats.shipReconstruction.probable}
            to="/ship-features?status=PROBABLE"
          />
          <StatCard
            label="Possible"
            value={stats.shipReconstruction.possible}
            to="/ship-features?status=POSSIBLE"
          />
          <StatCard
            label="Rejected"
            value={stats.shipReconstruction.rejected}
            to="/ship-features?status=REJECTED"
          />
          <StatCard
            label="Critical Visual Features"
            value={stats.shipReconstruction.criticalVisual}
            to="/ship-features?visualImpact=CRITICAL"
          />
          <StatCard
            label="Critical Features Without Evidence"
            value={stats.shipReconstruction.criticalWithoutEvidence}
            to="/ship-features?visualImpact=CRITICAL&withoutEvidence=1"
          />
        </div>
      </section>

      <section className="mt-8">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">Observations</h3>
        <p className="mb-4 text-sm text-stone-600">
          Research quality indicators for the observation layer.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Observations"
            value={stats.observationsQuality.total}
            to="/observations"
          />
          <StatCard
            label="Observations Without Claims"
            value={stats.observationsQuality.withoutClaims}
            to="/observations?unlinked=1"
          />
          <StatCard
            label="Claims Without Observations"
            value={stats.observationsQuality.claimsWithoutObservations}
            to="/claims"
          />
        </div>
      </section>

      <section className="mt-8">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">Tier 1 Claims</h3>
        <p className="mb-4 text-sm text-stone-600">
          Core thesis claims that directly support the central arguments of the book.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Tier 1"
            value={stats.tier1.total}
            to="/claims?tier=TIER_1"
          />
          <StatCard
            label="Supported"
            value={stats.tier1.supported}
            to="/claims?tier=TIER_1&status=SUPPORTED"
          />
          <StatCard
            label="Under Investigation"
            value={stats.tier1.underInvestigation}
            to="/claims?tier=TIER_1&status=UNDER_INVESTIGATION"
          />
          <StatCard
            label="Unresolved"
            value={stats.tier1.unresolved}
            to="/claims?tier=TIER_1&status=UNRESOLVED"
          />
        </div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Sources" value={stats.sources} to="/sources" />
        <StatCard label="Observations" value={stats.observations} to="/observations" />
        <StatCard label="Claims" value={stats.claims} to="/claims" />
        <StatCard label="Evidence Links" value={stats.evidenceLinks} to="/evidence" />
        <StatCard label="People" value={stats.people} to="/people" />
        <StatCard label="Places" value={stats.places} to="/places" />
        <StatCard label="Contradictions" value={stats.contradictions} to="/contradictions" />
      </div>

      {stats.topCategories.length > 0 && (
        <section className="mt-10">
          <h3 className="mb-4 text-lg font-semibold text-stone-900">Top Source Categories</h3>
          <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
            <ul className="divide-y divide-stone-100">
              {stats.topCategories.map((cat) => (
                <li key={cat.name} className="flex items-center justify-between px-5 py-3">
                  <Link
                    to={`/sources?category=${encodeURIComponent(cat.name)}`}
                    className="text-sm text-stone-800 hover:underline"
                  >
                    {cat.name}
                  </Link>
                  <span className="text-sm font-medium text-stone-600">{cat.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          to="/observations"
          className="rounded-lg border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950 hover:bg-sky-100"
        >
          <strong className="block text-sky-900">Work with observations</strong>
          Extract what sources say, then build and link claims from those observations.
        </Link>
        <Link
          to="/claims?tier=TIER_1"
          className="rounded-lg border border-violet-200 bg-violet-50 p-5 text-sm text-violet-950 hover:bg-violet-100"
        >
          <strong className="block text-violet-900">Review Tier 1 claims</strong>
          Open the core thesis claims and trace each to its supporting evidence.
        </Link>
        <Link
          to="/ship-features"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 hover:bg-emerald-100"
        >
          <strong className="block text-emerald-900">Ship reconstruction</strong>
          Review technical features, link observations, and identify visual reconstruction gaps.
        </Link>
        <Link
          to="/evidence"
          className="rounded-lg border border-stone-200 bg-stone-50 p-5 text-sm text-stone-700 hover:bg-stone-100"
        >
          <strong className="block text-stone-900">Evidence Explorer</strong>
          Review all evidence links across the project with filters and sorting.
        </Link>
      </section>
    </div>
  );
}
