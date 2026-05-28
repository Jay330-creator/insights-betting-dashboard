import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { BottomWave } from './BottomWave';
import { HeroViz } from './HeroViz';

const nav = [
  { to: '/', label: 'Overview' },
  { to: '/history', label: 'Pick History' },
  { to: '/analytics', label: 'Performance Analytics' },
  { to: '/costs', label: 'Costs' },
  { to: '/research', label: 'AI Research Logs' },
];

export function Layout() {
  const { pathname } = useLocation();
  const showHeroViz = pathname === '/';

  return (
    <div className="relative min-h-screen text-text">
      <div className="site-bg" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col">
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

        {showHeroViz && (
          <section className="hero-viz-band" aria-hidden="true">
            <div className="mx-auto w-full max-w-6xl px-6 pt-6">
              <HeroViz />
            </div>
          </section>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
          <Outlet />
        </main>

        <div className="bottom-wave-wrap">
          <BottomWave />
          <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-10 pt-10 text-xs text-muted">
            Built by Jaden. Performance tracked live.
          </footer>
        </div>
      </div>
    </div>
  );
}
