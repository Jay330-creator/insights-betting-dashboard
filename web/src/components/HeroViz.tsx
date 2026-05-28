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
      <div className="hero-viz__hdr">
        <div className="hero-viz__title">Live Analytics</div>
        <div className="hero-viz__sub">Decorative render — motion only</div>
      </div>

      <div className="hero-viz__grid">
        {/* 3D-ish bars */}
        <div className="viz-card viz-card--bars">
          <div className="viz-card__label">Market Pulse</div>
          <div className="viz-bars" aria-hidden="true">
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

        {/* Donut */}
        <div className="viz-card viz-card--donut">
          <div className="viz-card__label">Allocation</div>
          <div className="viz-donut" aria-hidden="true">
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
                <circle
                  className="viz-donut__arc"
                  r="36"
                  cx="0"
                  cy="0"
                  stroke="url(#donutGrad)"
                />
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

        {/* Line */}
        <div className="viz-card viz-card--line">
          <div className="viz-card__label">Trend</div>
          <div className="viz-line" aria-hidden="true">
            <svg viewBox="0 0 420 140" className="viz-line__svg" preserveAspectRatio="none" role="presentation">
              <path
                className="viz-line__grid"
                d="M0 120 H420 M0 90 H420 M0 60 H420 M0 30 H420"
              />
              <path
                className="viz-line__path"
                d="M0 98 C40 30, 76 120, 110 72 C146 20, 170 110, 206 62 C244 10, 270 110, 308 56 C350 0, 372 90, 420 42"
              />
              <path
                className="viz-line__path viz-line__path--ghost"
                d="M0 104 C40 44, 76 120, 110 86 C146 34, 170 120, 206 78 C244 28, 270 120, 308 70 C350 18, 372 110, 420 58"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

