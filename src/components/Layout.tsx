import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/sources", label: "Sources", primary: true },
  { to: "/claims", label: "Claims", primary: true },
  { to: "/evidence-links", label: "Evidence Links" },
  { to: "/people", label: "People" },
  { to: "/places", label: "Places" },
  { to: "/events", label: "Timeline" },
  { to: "/contradictions", label: "Contradictions" },
  { to: "/manuscript-references", label: "Manuscript Refs" },
  { to: "/tags", label: "Tags" },
  { to: "/relationships", label: "Relationships" },
  { to: "/import", label: "Import" },
];

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-stone-200 bg-stone-100">
        <div className="border-b border-stone-200 px-4 py-5">
          <h1 className="text-sm font-semibold tracking-wide text-stone-800 uppercase">
            Georgette Research
          </h1>
          <p className="mt-1 text-xs text-stone-500">Claim-centred workbench</p>
        </div>
        <nav className="p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "mb-0.5 block rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-stone-800 text-white"
                    : "text-stone-700 hover:bg-stone-200",
                  item.primary && !isActive ? "font-medium" : "",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
