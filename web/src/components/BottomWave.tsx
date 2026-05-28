export function BottomWave() {
  return (
    <div className="bottom-wave" aria-hidden="true">
      <svg
        className="bottom-wave__svg"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        role="presentation"
      >
        <defs>
          <filter id="waveGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.9 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="waveFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(13, 17, 23, 0)" />
            <stop offset="45%" stopColor="rgba(13, 17, 23, 0)" />
            <stop offset="100%" stopColor="rgba(13, 17, 23, 1)" />
          </linearGradient>
        </defs>

        {/* subtle bottom fade so the wave sits "in" the page */}
        <rect x="0" y="0" width="1200" height="160" fill="url(#waveFade)" />

        {/* back lane */}
        <g className="bottom-wave__scroll bottom-wave__scroll--slow">
          <path
            className="bottom-wave__path bottom-wave__path--back"
            d="M0 92 C50 112, 150 72, 200 92 C250 112, 350 72, 400 92 C450 112, 550 72, 600 92 C650 112, 750 72, 800 92 C850 112, 950 72, 1000 92 C1050 112, 1150 72, 1200 92"
            fill="none"
          />
          <path
            className="bottom-wave__path bottom-wave__path--back"
            d="M0 92 C50 112, 150 72, 200 92 C250 112, 350 72, 400 92 C450 112, 550 72, 600 92 C650 112, 750 72, 800 92 C850 112, 950 72, 1000 92 C1050 112, 1150 72, 1200 92"
            transform="translate(1200 0)"
            fill="none"
          />
        </g>

        {/* front lane */}
        <g className="bottom-wave__scroll bottom-wave__scroll--fast">
          <path
            className="bottom-wave__path bottom-wave__path--front"
            d="M0 72 C50 38, 150 106, 200 72 C250 38, 350 106, 400 72 C450 38, 550 106, 600 72 C650 38, 750 106, 800 72 C850 38, 950 106, 1000 72 C1050 38, 1150 106, 1200 72"
            filter="url(#waveGlow)"
            fill="none"
          />
          <path
            className="bottom-wave__path bottom-wave__path--front"
            d="M0 72 C50 38, 150 106, 200 72 C250 38, 350 106, 400 72 C450 38, 550 106, 600 72 C650 38, 750 106, 800 72 C850 38, 950 106, 1000 72 C1050 38, 1150 106, 1200 72"
            transform="translate(1200 0)"
            filter="url(#waveGlow)"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}

