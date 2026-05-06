import { NavLink, Outlet } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Overview' },
  { to: '/history', label: 'Pick History' },
  { to: '/analytics', label: 'Performance Analytics' },
  { to: '/costs', label: 'Costs' },
  { to: '/research', label: 'AI Research Logs' },
];

export function Layout() {
  const demo = (() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('demo') === '1';
    } catch {
      return false;
    }
  })();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-panel/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xl font-extrabold tracking-tight">Insights Betting</div>
            <div className="text-xs text-gray-400">Discord Betting Agent Analytics Suite</div>
          </div>
          <div
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              demo
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {demo ? 'Demo Mode • Sample Data' : 'Live • Real Picks'}
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-6 pb-3">
          <div className="flex flex-wrap gap-2">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `rounded-full border px-3 py-1 text-sm transition ${
                    isActive
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
                      : 'border-border bg-white/0 text-gray-300 hover:bg-white/5'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-gray-500">
        Built by Jaden. Performance tracked live.
      </footer>
    </div>
  );
}
