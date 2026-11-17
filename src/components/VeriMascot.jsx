import { useId } from "react";
import { motion } from "framer-motion";
import "./VeriMascot.css";

/**
 * Veri, the VERITAS fox.
 * An original character: orange fox in a hex-circuit suit with a navy vest
 * and a shield that reports the verification state.
 *
 * Props
 *  - mood:    "happy" | "thinking" | "success" | "warning" | "error"
 *  - message: speech-bubble text. Omit for the mood's default, pass `false` to hide.
 *  - size:    rendered width of the character in px
 */
const MOODS = {
  happy: "Hi, I'm Veri. Ready when you are.",
  thinking: "Checking the chain, one moment.",
  success: "Verified. This one is genuine.",
  warning: "Heads up: this record was revoked.",
  error: "I couldn't confirm this one.",
};

const ORANGE = "#ff8a1f";
const ORANGE_DEEP = "#e2661a";
const CREAM = "#fff3e3";
const INK = "#1a0f2e";
const CYAN = "#3ee0ff";

function Eyes({ mood }) {
  if (mood === "success") {
    return (
      <g fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round">
        <path d="M121 102 Q132 88 143 102" />
        <path d="M177 102 Q188 88 199 102" />
      </g>
    );
  }

  const look = mood === "thinking" ? { x: 3, y: -4 } : { x: 0, y: 0 };

  return (
    <g className="veri-eyes">
      {[132, 188].map((cx) => (
        <g key={cx} transform={`translate(${cx} 98)`}>
          <g className="veri-eye">
            <ellipse rx="12.5" ry="14.5" fill="#5a2a14" />
            <ellipse cx={look.x} cy={look.y} rx="8.5" ry="10.5" fill={INK} />
            <circle cx={-3 + look.x} cy={-5 + look.y} r="4" fill="#fff" />
            <circle cx={4 + look.x} cy={4 + look.y} r="2" fill="#fff" opacity=".9" />
          </g>
        </g>
      ))}
    </g>
  );
}

function Brows({ mood }) {
  const stroke = { stroke: ORANGE_DEEP, strokeWidth: 4, strokeLinecap: "round", fill: "none" };

  if (mood === "error" || mood === "warning") {
    return (
      <g {...stroke}>
        <path d="M118 78 L144 72" />
        <path d="M202 78 L176 72" />
      </g>
    );
  }

  return (
    <g {...stroke}>
      <path d="M119 76 Q132 68 145 74" />
      <path d="M201 76 Q188 68 175 74" />
    </g>
  );
}

function Mouth({ mood }) {
  if (mood === "happy" || mood === "success") {
    return (
      <>
        <path d="M144 138 Q160 143 176 138 Q172 157 160 157 Q148 157 144 138Z" fill="#6b1626" />
        <path d="M152 151 Q160 146 168 151 Q165 157 160 157 Q155 157 152 151Z" fill="#ff7a8a" />
      </>
    );
  }

  const paths = {
    thinking: "M148 145 Q160 150 172 142",
    warning: "M147 146 Q154 142 160 146 T173 146",
    error: "M148 150 Q160 139 172 150",
  };

  return (
    <path
      d={paths[mood]}
      fill="none"
      stroke={INK}
      strokeWidth="4"
      strokeLinecap="round"
    />
  );
}

function ShieldGlyph({ mood }) {
  if (mood === "success") {
    return (
      <path
        d="M-15 3 L-4 15 L16 -11"
        fill="none"
        stroke="#3dffb0"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (mood === "error") {
    return (
      <path
        d="M-12 -10 L12 14 M12 -10 L-12 14"
        stroke="#ff6b6b"
        strokeWidth="7"
        strokeLinecap="round"
      />
    );
  }

  if (mood === "warning") {
    return (
      <g stroke="#ffb547" strokeWidth="7" strokeLinecap="round">
        <path d="M0 -14 L0 6" />
        <path d="M0 18 L0 18.1" />
      </g>
    );
  }

  if (mood === "thinking") {
    return (
      <g>
        <polygon
          points="0,-20 17,-10 17,10 0,20 -17,10 -17,-10"
          fill="none"
          stroke={CYAN}
          strokeWidth="3"
        />
        <rect className="veri-scan" x="-20" y="-2" width="40" height="3" rx="1.5" fill="#bff6ff" />
      </g>
    );
  }

  return (
    <g>
      <polygon points="0,-24 15,1 0,-4 -15,1" fill="#ffd166" />
      <polygon points="0,-4 15,1 0,8 -15,1" fill="#f2a93b" />
      <polygon points="0,11 15,4 0,26 -15,4" fill="#ffd166" />
    </g>
  );
}

export default function VeriMascot({ mood = "happy", message, size = 240 }) {
  const uid = useId().replace(/:/g, "");
  const id = (name) => `${name}-${uid}`;
  const current = MOODS[mood] ? mood : "happy";
  const text = message === false ? null : message || MOODS[current];

  return (
    <motion.figure
      className={`veri veri-${current}`}
      style={{ "--veri-size": `${size}px` }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      {text && (
        <figcaption className="veri-bubble">
          <span role="status" aria-live="polite">{text}</span>
        </figcaption>
      )}

      <div className="veri-stage">
        <div className="veri-aura" aria-hidden="true" />

        <motion.svg
          viewBox="0 0 320 380"
          className="veri-character"
          role="img"
          aria-label="Veri, the VERITAS fox"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <defs>
            <pattern
              id={id("hex")}
              width="13.856"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M6.928 0 L13.856 4 V12 L6.928 16 L0 12 V4 Z M6.928 16 V24"
                fill="none"
                stroke={CYAN}
                strokeWidth="1"
                opacity=".75"
              />
              <circle cx="6.928" cy="8" r="1.6" fill="#ffd166" opacity=".9" />
            </pattern>

            <linearGradient id={id("suit")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2f86ff" />
              <stop offset="1" stopColor="#0a3fb8" />
            </linearGradient>

            <linearGradient id={id("fur")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffa036" />
              <stop offset="1" stopColor={ORANGE_DEEP} />
            </linearGradient>

            <linearGradient id={id("shield")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1ea5ff" stopOpacity=".55" />
              <stop offset="1" stopColor="#0a2a8a" stopOpacity=".85" />
            </linearGradient>

            <radialGradient id={id("floor")} cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor={CYAN} stopOpacity=".55" />
              <stop offset="1" stopColor={CYAN} stopOpacity="0" />
            </radialGradient>

            <filter id={id("glow")} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Hologram platform */}
          <ellipse cx="160" cy="348" rx="140" ry="30" fill={`url(#${id("floor")})`} />
          <polygon
            points="58,346 100,324 220,324 262,346 220,368 100,368"
            fill="rgba(33,212,253,.12)"
            stroke={CYAN}
            strokeWidth="1.5"
            filter={`url(#${id("glow")})`}
          />
          <polygon
            points="86,346 112,332 208,332 234,346 208,360 112,360"
            fill="none"
            stroke={ORANGE}
            strokeWidth="2"
            opacity=".85"
          />

          {/* Floating blocks */}
          <g className="veri-float-a" fill="none" strokeWidth="2">
            <polygon points="30,92 44,84 58,92 58,108 44,116 30,108" stroke={ORANGE} />
          </g>
          <g className="veri-float-b" fill="none" strokeWidth="2">
            <polygon points="270,46 282,39 294,46 294,60 282,67 270,60" stroke={CYAN} />
          </g>

          {/* Tail */}
          <g className="veri-tail">
            <path
              d="M124 286 C70 304 24 270 32 212 C36 188 50 174 62 166 C64 200 86 228 128 244 Z"
              fill={`url(#${id("fur")})`}
            />
            <path
              d="M62 166 C50 175 37 190 32 212 C44 206 56 198 67 190 C66 182 64 174 62 166Z"
              fill={CREAM}
            />
          </g>

          {/* Legs */}
          {[
            "M122 262 L118 326 Q118 336 128 336 L148 336 Q156 336 156 328 L156 262 Z",
            "M164 262 L164 328 Q164 336 172 336 L192 336 Q202 336 202 326 L198 262 Z",
          ].map((d) => (
            <g key={d}>
              <path d={d} fill={`url(#${id("suit")})`} stroke={CYAN} strokeWidth="2" />
              <path d={d} fill={`url(#${id("hex")})`} />
            </g>
          ))}
          <rect x="116" y="330" width="42" height="7" rx="3.5" fill={CYAN} opacity=".85" />
          <rect x="162" y="330" width="42" height="7" rx="3.5" fill={CYAN} opacity=".85" />

          {/* Torso */}
          <path
            d="M110 178 Q160 160 210 178 L214 272 Q160 286 106 272 Z"
            fill={`url(#${id("suit")})`}
            stroke={CYAN}
            strokeWidth="2"
          />
          <path
            d="M110 178 Q160 160 210 178 L214 272 Q160 286 106 272 Z"
            fill={`url(#${id("hex")})`}
          />

          {/* Left arm, fist on hip */}
          <path d="M116 192 Q82 214 98 252" fill="none" stroke={CYAN} strokeWidth="32" strokeLinecap="round" />
          <path d="M116 192 Q82 214 98 252" fill="none" stroke={`url(#${id("suit")})`} strokeWidth="28" strokeLinecap="round" />
          <path d="M116 192 Q82 214 98 252" fill="none" stroke={`url(#${id("hex")})`} strokeWidth="28" strokeLinecap="round" />
          <circle cx="98" cy="254" r="15" fill="#1f6bff" stroke={CYAN} strokeWidth="2" />

          {/* Vest */}
          <path
            d="M122 180 Q160 168 198 180 L196 268 Q160 278 124 268 Z"
            fill="#13205a"
            stroke="#2d4399"
            strokeWidth="2"
          />
          <path d="M160 176 L160 272" stroke={CYAN} strokeWidth="2.5" opacity=".9" />
          <path d="M122 180 L142 174 L148 192 L126 198Z" fill={ORANGE} />
          <path d="M198 180 L178 174 L172 192 L194 198Z" fill={ORANGE} />
          <polygon
            points="138,206 150,213 150,227 138,234 126,227 126,213"
            fill="#0d3a9e"
            stroke={CYAN}
            strokeWidth="2"
          />
          <path d="M132 216 L138 227 L144 216" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="172" y="212" width="18" height="22" rx="4" fill="none" stroke={ORANGE} strokeWidth="2.5" />
          <path d="M122 258 L142 262" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" />
          <path d="M198 258 L178 262" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" />

          {/* Chest fur */}
          <path d="M136 166 L160 202 L184 166 Q160 176 136 166Z" fill={CREAM} />

          {/* Right arm raised */}
          <path d="M204 192 Q244 210 238 176" fill="none" stroke={CYAN} strokeWidth="32" strokeLinecap="round" />
          <path d="M204 192 Q244 210 238 176" fill="none" stroke={`url(#${id("suit")})`} strokeWidth="28" strokeLinecap="round" />
          <path d="M204 192 Q244 210 238 176" fill="none" stroke={`url(#${id("hex")})`} strokeWidth="28" strokeLinecap="round" />

          {/* Shield */}
          <g transform="translate(262 136)">
            <path
              d="M0 -44 L35 -31 L35 6 C35 31 17 46 0 54 C-17 46 -35 31 -35 6 L-35 -31 Z"
              fill={`url(#${id("shield")})`}
              stroke="#7fe9ff"
              strokeWidth="2.5"
              filter={`url(#${id("glow")})`}
            />
            <path
              d="M0 -44 L35 -31 L35 6 C35 31 17 46 0 54 C-17 46 -35 31 -35 6 L-35 -31 Z"
              fill={`url(#${id("hex")})`}
              opacity=".55"
            />
            <g transform="translate(0 3)">
              <ShieldGlyph mood={current} />
            </g>
          </g>
          <circle cx="238" cy="178" r="15" fill="#1f6bff" stroke={CYAN} strokeWidth="2" />

          {/* Head */}
          <path d="M104 76 L94 20 L148 52 Z" fill={`url(#${id("fur")})`} />
          <path d="M216 76 L226 20 L172 52 Z" fill={`url(#${id("fur")})`} />
          <path d="M108 68 L104 38 L132 55 Z" fill={CREAM} />
          <path d="M212 68 L216 38 L188 55 Z" fill={CREAM} />
          <path d="M94 20 L101 42 L112 36 Z" fill="#6b2b12" />
          <path d="M226 20 L219 42 L208 36 Z" fill="#6b2b12" />

          <path d="M90 118 L68 132 L96 140 Z" fill={`url(#${id("fur")})`} />
          <path d="M230 118 L252 132 L224 140 Z" fill={`url(#${id("fur")})`} />

          <path
            d="M160 162 C121 162 90 144 84 113 C80 92 96 70 118 62 C134 56 186 56 202 62 C224 70 240 92 236 113 C230 144 199 162 160 162Z"
            fill={`url(#${id("fur")})`}
          />
          <path
            d="M94 118 C110 152 138 162 160 162 C182 162 210 152 226 118 C206 134 184 132 160 126 C136 132 114 134 94 118Z"
            fill={CREAM}
          />
          <ellipse cx="108" cy="128" rx="10" ry="6" fill="#ff7a8a" opacity=".28" />
          <ellipse cx="212" cy="128" rx="10" ry="6" fill="#ff7a8a" opacity=".28" />

          <Brows mood={current} />
          <Eyes mood={current} />

          <ellipse cx="160" cy="129" rx="9" ry="6.5" fill={INK} />
          <ellipse cx="157" cy="127" rx="3" ry="1.6" fill="#fff" opacity=".7" />
          <path d="M160 135 L160 140" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <Mouth mood={current} />
        </motion.svg>
      </div>
    </motion.figure>
  );
}
