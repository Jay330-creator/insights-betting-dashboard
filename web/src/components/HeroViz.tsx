const bars = [
  { h: 0.28, c: 'mint' },
  { h: 0.46, c: 'teal' },
  { h: 0.66, c: 'green' },
  { h: 0.52, c: 'mint' },
  { h: 0.78, c: 'green' },
  { h: 0.40, c: 'teal' },
  { h: 0.60, c: 'green' },
  { h: 0.34, c: 'mint' },
];

export function HeroViz() {
  return (
    <div className="hero-viz" role="presentation">
      <div className="hero-viz__inner">
        <div className="hero-viz__copy">
          <div className="hero-viz__kicker">Overview</div>
          <div className="hero-viz__title">Premium analytics, at a glance</div>
          <div className="hero-viz__sub">
            Decorative motion panel (no real data) — built to match the sportsbook theme.
          </div>
        </div>

        {/* Art is in its own column so it can never overlap text */}
        <div className="hero-viz__art" aria-hidden="true">
          <div className="hero-viz__stage">
            {/* Base: looping line */}
            <div className="hero-viz__layer hero-viz__layer--line">
              <svg
                viewBox="0 0 520 180"
                className="viz-line__svg"
                preserveAspectRatio="none"
                role="presentation"
              >
                <path className="viz-line__grid" d="M0 150 H520 M0 115 H520 M0 80 H520 M0 45 H520" />
                <path
                  className="viz-line__path"
                  d="M0 122 C54 44, 92 170, 138 92 C184 20, 222 150, 274 78 C320 8, 360 154, 408 66 C458 0, 484 128, 520 48"
                />
                <path
                  className="viz-line__path viz-line__path--ghost"
                  d="M0 132 C54 64, 92 176, 138 106 C184 40, 222 166, 274 96 C320 32, 360 168, 408 88 C458 22, 484 150, 520 76"
                />
              </svg>
            </div>

            {/* Foreground: 3D-ish bars */}
            <div className="hero-viz__layer hero-viz__layer--bars">
              <div className="viz-bars" role="presentation">
                {bars.map((b, i) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    className={`viz-bar viz-bar--${b.c}`}
                    style={{ ['--h' as never]: `${Math.round(b.h * 100)}%`, ['--d' as never]: `${i * 70}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* Accent: donut */}
            <div className="hero-viz__layer hero-viz__layer--donut">
              <svg viewBox="0 0 120 120" className="viz-donut__svg" role="presentation">
                <defs>
                  <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00D26A" />
                    <stop offset="55%" stopColor="#22E6C8" />
                    <stop offset="100%" stopColor="#76F7A5" />
                  </linearGradient>
                </defs>

                <g className="viz-donut__spin" transform="translate(60 60)">
                  <circle className="viz-donut__track" r="36" cx="0" cy="0" />
                  <circle className="viz-donut__arc" r="36" cx="0" cy="0" stroke="url(#donutGrad)" />
                  <circle
                    className="viz-donut__arc viz-donut__arc--thin"
                    r="24"
                    cx="0"
                    cy="0"
                    stroke="rgba(0, 210, 106, 0.55)"
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
