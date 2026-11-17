import { useId, useMemo } from "react";
import { fingerprintRidges } from "../lib/fingerprint";
import "./Fingerprint.css";

/**
 * A fingerprint generated from a document hash.
 *
 * state: "idle" (static) | "scanning" (scan line + pulsing ridges)
 *        | "valid" | "revoked" | "missing" (tinted result)
 */
export default function Fingerprint({
  hash,
  size = 120,
  state = "idle",
  label,
  decorative = false,
  animate = true
}) {
  const uid = useId().replace(/:/g, "");
  const { rings, core } = useMemo(() => fingerprintRidges(hash), [hash]);

  const accessibleProps = decorative
    ? { "aria-hidden": "true" }
    : {
        role: "img",
        "aria-label":
          label ||
          (hash
            ? "Unique fingerprint generated from the document's SHA-256 hash"
            : "Empty fingerprint placeholder")
      };

  return (
    <svg
      className={`fp fp-${state} ${hash ? "" : "fp-empty"} ${animate ? "fp-animate" : ""}`}
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      {...accessibleProps}
    >
      <defs>
        <clipPath id={`clip-${uid}`}>
          <ellipse cx="50" cy="60" rx="41" ry="55" />
        </clipPath>
        <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--fp-a)" />
          <stop offset="1" stopColor="var(--fp-b)" />
        </linearGradient>
      </defs>

      <ellipse className="fp-plate" cx="50" cy="60" rx="46" ry="58" />

      <g clipPath={`url(#clip-${uid})`} key={hash || "empty"}>
        {rings.map((ring, index) => (
          <path
            key={index}
            className="fp-ridge"
            d={ring.d}
            pathLength="100"
            strokeDasharray={ring.dash}
            strokeDashoffset={ring.offset}
            stroke={`url(#grad-${uid})`}
            style={{ "--i": index }}
          />
        ))}

        <circle className="fp-core" cx={core.x} cy={core.y} r="2.4" />

        {state === "scanning" && (
          <rect className="fp-scan" x="0" y="0" width="100" height="6" />
        )}
      </g>
    </svg>
  );
}
