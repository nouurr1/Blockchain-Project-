/** SHA-256 of a string, as a 0x-prefixed hex string (same format as the contract). */
export async function sha256Text(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return (
    "0x" +
    Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function shortHash(hash, head = 6, tail = 4) {
  if (!hash) return "";
  return `${hash.slice(0, 2 + head)}…${hash.slice(-tail)}`;
}

/** Number of differing bits between two 64-character hex hashes (0 to 256). */
export function bitDifference(a, b) {
  if (!a || !b) return 0;

  const x = a.replace(/^0x/, "");
  const y = b.replace(/^0x/, "");
  let bits = 0;

  for (let i = 0; i < Math.min(x.length, y.length); i += 1) {
    let diff = parseInt(x[i], 16) ^ parseInt(y[i], 16);

    while (diff) {
      bits += diff & 1;
      diff >>= 1;
    }
  }

  return bits;
}

function toBytes(hash) {
  const hex = (hash || "").replace(/^0x/, "").padEnd(64, "0");
  const bytes = [];

  for (let i = 0; i < 64; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16) || 0);
  }

  return bytes;
}

// Closed Catmull-Rom spline through the points, as an SVG path.
function smoothClosedPath(points) {
  const n = points.length;
  let d = `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;

  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }

  return `${d}Z`;
}

/**
 * Turns a document hash into a fingerprint: a set of ridge rings whose shape,
 * spacing, tilt and breaks are all derived from the hash bytes.
 * Same hash, same print. One flipped bit, a visibly different print.
 */
export function fingerprintRidges(hash) {
  const bytes = toBytes(hash);
  const b = (i) => bytes[i % 32] / 255;

  const cx = 50 + (b(0) - 0.5) * 12;
  const cy = 58 + (b(1) - 0.5) * 12;
  const ratio = 1.1 + b(2) * 0.3;
  const tilt = ((b(3) - 0.5) * 50 * Math.PI) / 180;
  const gap = 3.1 + b(4) * 0.9;

  const harmonics = [2, 3, 4, 5].map((h, i) => ({
    h,
    amp: 0.025 + b(5 + i) * 0.075,
    phase: b(9 + i) * Math.PI * 2,
    drift: (b(13 + i) - 0.5) * 0.35
  }));

  const rings = [];
  const steps = 30;

  for (let k = 0; k < 17; k += 1) {
    const base = 3 + k * gap;
    const points = [];

    for (let j = 0; j < steps; j += 1) {
      const theta = (j / steps) * Math.PI * 2;

      let wobble = 1;

      for (const { h, amp, phase, drift } of harmonics) {
        wobble += amp * Math.sin(h * theta + phase + k * drift);
      }

      wobble += (b(17 + (k % 14)) - 0.5) * 0.05;

      const r = base * wobble;
      const px = r * Math.cos(theta);
      const py = r * Math.sin(theta) * ratio;

      points.push([
        cx + px * Math.cos(tilt) - py * Math.sin(tilt),
        cy + px * Math.sin(tilt) + py * Math.cos(tilt)
      ]);
    }

    const dashOn = 62 + b(k + 3) * 34;
    const dashOff = 1.5 + b(k + 7) * 7;

    rings.push({
      d: smoothClosedPath(points),
      dash: `${dashOn.toFixed(1)} ${dashOff.toFixed(1)}`,
      offset: (b(k + 11) * 100).toFixed(1)
    });
  }

  return { rings, core: { x: cx, y: cy } };
}

/** 256 booleans, one per bit: true where the two hashes differ. */
export function bitMap(a, b) {
  const x = (a || "").replace(/^0x/, "").padEnd(64, "0");
  const y = (b || "").replace(/^0x/, "").padEnd(64, "0");
  const map = [];

  for (let i = 0; i < 64; i += 1) {
    const diff = parseInt(x[i], 16) ^ parseInt(y[i], 16);

    for (let bit = 3; bit >= 0; bit -= 1) {
      map.push(Boolean((diff >> bit) & 1));
    }
  }

  return map;
}
