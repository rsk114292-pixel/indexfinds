"use client";

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  delay: number;
  duration: number;
  color: string;
}

function createStars(count: number, seed: number, near = false): Star[] {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const colors = ["#ffffff", "#cfe7ff", "#e7d7ff", "#b8ccff"];

  return Array.from({ length: count }, () => ({
    x: random() * 1440,
    y: random() * 900,
    radius: near ? 0.9 + random() * 1.25 : 0.35 + random() * 0.75,
    opacity: near ? 0.48 + random() * 0.42 : 0.25 + random() * 0.48,
    delay: -(random() * 8),
    duration: 3.8 + random() * 5.2,
    color: colors[Math.floor(random() * colors.length)],
  }));
}

const FAR_STARS = createStars(128, 0x1f2026);
const NEAR_STARS = createStars(34, 0x51a7f13d, true);

export default function StarField({ compact = false }: { compact?: boolean }) {
  // Mobile uses a much smaller particle set. This keeps the same visual
  // identity without animating more than 160 individual SVG nodes off-screen.
  const farStars = compact ? FAR_STARS.slice(0, 48) : FAR_STARS;
  const nearStars = compact ? NEAR_STARS.slice(0, 12) : NEAR_STARS;
  const mask = compact
    ? "radial-gradient(ellipse 82% 56% at 50% 48%, transparent 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.82) 78%, black 100%)"
    : "radial-gradient(ellipse 52% 42% at 50% 48%, transparent 0%, rgba(0,0,0,0.12) 46%, rgba(0,0,0,0.78) 76%, black 100%)";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g className="star-layer star-layer-far">
          {farStars.map((star, index) => (
            <circle
              key={`far-${index}`}
              className={
                index % 3 === 0
                  ? "star-twinkle star-twinkle-bright"
                  : index % 3 === 1
                    ? "star-twinkle star-twinkle-soft"
                    : undefined
              }
              cx={star.x}
              cy={star.y}
              r={star.radius}
              fill={star.color}
              opacity={star.opacity}
              style={{
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}
        </g>
        <g className="star-layer star-layer-near">
          {nearStars.map((star, index) => (
            <circle
              key={`near-${index}`}
              className={`star-twinkle ${
                index % 2 === 0
                  ? "star-twinkle-bright"
                  : "star-twinkle-soft"
              }`}
              cx={star.x}
              cy={star.y}
              r={star.radius}
              fill={star.color}
              opacity={star.opacity}
              style={{
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}
        </g>
      </svg>

      <span className="meteor meteor-one" />
      {!compact ? <span className="meteor meteor-two" /> : null}

      <style jsx>{`
        .star-layer {
          transform-box: fill-box;
          transform-origin: center;
          will-change: transform;
        }

        .star-layer-far {
          animation: star-drift-far 95s ease-in-out infinite alternate;
        }

        .star-layer-near {
          animation: star-drift-near 68s ease-in-out infinite alternate;
        }

        .star-twinkle {
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          transform-box: fill-box;
          transform-origin: center;
          will-change: opacity, transform;
        }

        .star-twinkle-bright {
          animation-name: star-twinkle-bright;
        }

        .star-twinkle-soft {
          animation-name: star-twinkle-soft;
        }

        .meteor {
          position: absolute;
          z-index: 1;
          display: block;
          width: 118px;
          height: 1px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(184, 204, 255, 0.2) 34%,
            rgba(221, 233, 255, 0.95) 88%,
            white 100%
          );
          filter: drop-shadow(0 0 5px rgba(147, 197, 253, 0.75));
          opacity: 0;
          transform: rotate(-24deg) translate3d(-80px, 0, 0);
          transform-origin: right center;
          will-change: opacity, transform;
        }

        .meteor-one {
          left: 68%;
          top: 19%;
          animation: meteor-cross 13s ease-in infinite;
          animation-delay: -8.2s;
        }

        .meteor-two {
          left: 13%;
          top: 39%;
          width: 86px;
          animation: meteor-cross 18s ease-in infinite;
          animation-delay: -2.7s;
        }

        @keyframes star-drift-far {
          to {
            transform: translate3d(12px, -8px, 0) scale(1.008);
          }
        }

        @keyframes star-drift-near {
          to {
            transform: translate3d(-16px, 11px, 0) scale(1.012);
          }
        }

        @keyframes star-twinkle-bright {
          0%,
          100% {
            opacity: 0.22;
            transform: scale(0.72);
          }
          46% {
            opacity: 0.95;
            transform: scale(1.24);
          }
          58% {
            opacity: 0.68;
            transform: scale(1);
          }
        }

        @keyframes star-twinkle-soft {
          0%,
          100% {
            opacity: 0.32;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.72;
            transform: scale(1.08);
          }
        }

        @keyframes meteor-cross {
          0%,
          72% {
            opacity: 0;
            transform: rotate(-24deg) translate3d(-80px, 0, 0);
          }
          76% {
            opacity: 0.9;
          }
          86% {
            opacity: 0;
            transform: rotate(-24deg) translate3d(290px, 0, 0);
          }
          100% {
            opacity: 0;
            transform: rotate(-24deg) translate3d(290px, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .star-layer,
          .star-twinkle,
          .meteor {
            animation: none !important;
          }

          .meteor {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
