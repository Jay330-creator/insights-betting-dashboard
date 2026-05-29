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
          <div className="hero-viz__title">Premium analytics, at a glance</div>
          <div className="hero-viz__sub">Live performance, tracked end to end.</div>
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

            {/* Accent: stacked sparklines */}
            <div className="hero-viz__layer hero-viz__layer--spark">
              <div className="viz-sparks" role="presentation">
                <div className="viz-sparks__label">Trends</div>
                <svg viewBox="0 0 180 96" className="viz-sparks__svg" preserveAspectRatio="none" role="presentation">
                  <path className="viz-sparks__grid" d="M0 32 H180 M0 64 H180" />
                  <path
                    className="viz-spark viz-spark--a"
                    d="M0 72 C20 38, 40 88, 60 58 C80 28, 100 78, 120 44 C140 18, 160 66, 180 34"
                  />
                  <path
                    className="viz-spark viz-spark--b"
                    d="M0 60 C22 46, 44 78, 66 52 C88 26, 110 64, 132 40 C154 18, 170 54, 180 44"
                  />
                  <path
                    className="viz-spark viz-spark--c"
                    d="M0 80 C22 70, 44 90, 66 74 C88 56, 110 86, 132 64 C154 44, 170 82, 180 66"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
