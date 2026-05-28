import { NavLink, Outlet } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Overview' },
  { to: '/history', label: 'Pick History' },
  { to: '/analytics', label: 'Performance Analytics' },
  { to: '/costs', label: 'Costs' },
  { to: '/research', label: 'AI Research Logs' },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-bg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xl font-extrabold tracking-tight">Insights Betting</div>
            <div className="text-xs text-muted">Discord Betting Agent Analytics Suite</div>
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
                  `rounded-md border px-3 py-1 text-sm font-semibold transition ${
                    isActive
                      ? 'border-accent bg-card text-text'
                      : 'border-border bg-bg text-muted hover:bg-card'
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

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-muted">
        Built by Jaden. Performance tracked live.
      </footer>
    </div>
  );
}
