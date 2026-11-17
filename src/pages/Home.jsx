import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Blocks,
  Check,
  ChevronDown,
  FileText,
  Lock,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Shuffle,
  X
} from "lucide-react";

import Brand from "../components/Brand";
import Fingerprint from "../components/Fingerprint";
import VeriMascot from "../components/VeriMascot";
import { CONTRACT_ADDRESS } from "../contract";
import {
  bitDifference,
  bitMap,
  sha256Text,
  shortHash
} from "../lib/fingerprint";

const EXPLORER_ADDRESS = "https://sepolia.etherscan.io/address/";

const ORIGINAL = {
  name: "Amira Ben Salah",
  degree: "Computer Science",
  year: "2026"
};

const serialize = (fields) =>
  `${fields.name}|${fields.degree}|${fields.year}`;

const isPdf = (file) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

const proofSteps = [
  {
    id: "issue",
    tab: "Issue",
    title: "The university fingerprints the diploma",
    text: "When a graduate finishes, the university computes the PDF's SHA-256 fingerprint. Change a single pixel and you get a completely different one."
  },
  {
    id: "anchor",
    tab: "Anchor",
    title: "The fingerprint goes on Ethereum",
    text: "The fingerprint and the graduate's details are written to a public smart contract. The original PDF is kept on IPFS. Nobody can quietly edit the record."
  },
  {
    id: "check",
    tab: "Check",
    title: "Anyone can check a copy",
    text: "Your device fingerprints the PDF you received and compares it with the record. Same fingerprint means same document."
  }
];

const faqs = [
  {
    q: "Do you keep my PDF?",
    a: "No. Your browser computes the fingerprint on your device. Only the fingerprint is looked up on the blockchain."
  },
  {
    q: "Do I need a wallet or an account?",
    a: "No. Verifying is open to everyone and needs no sign-up."
  },
  {
    q: "What does “No matching record” mean?",
    a: "The university never registered this exact file. It could be a different version, a scan, or a forgery. Contact the issuer to confirm."
  },
  {
    q: "Who can issue diplomas?",
    a: "Only the university's owner wallet. Everyone can read the record. Nobody else can write to it."
  },
  {
    q: "Can a diploma be withdrawn?",
    a: "Yes. The university can revoke it, and anyone verifying it will see “Revoked”."
  }
];

function useSampleHash() {
  const [hash, setHash] = useState("");

  useEffect(() => {
    sha256Text("VERITAS sample diploma").then(setHash);
  }, []);

  return hash;
}

function TamperDemo() {
  const [fields, setFields] = useState(ORIGINAL);
  const [originalHash, setOriginalHash] = useState("");
  const [hash, setHash] = useState("");

  useEffect(() => {
    sha256Text(serialize(ORIGINAL)).then(setOriginalHash);
  }, []);

  useEffect(() => {
    let live = true;

    sha256Text(serialize(fields)).then((value) => {
      if (live) setHash(value);
    });

    return () => {
      live = false;
    };
  }, [fields]);

  const same = hash !== "" && hash === originalHash;
  const bits = bitDifference(hash, originalHash);
  const map = bitMap(hash, originalHash);

  const update = (key) => (event) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  const swapOneLetter = () =>
    setFields((current) => ({
      ...current,
      name: ORIGINAL.name.slice(0, -1) + "n"
    }));

  return (
    <div className="tamper">
      <div className="tamper-form card">
        <h3>Diploma details</h3>

        <label className="field">
          <span>Graduate</span>
          <input value={fields.name} onChange={update("name")} autoComplete="off" />
        </label>

        <label className="field">
          <span>Qualification</span>
          <input value={fields.degree} onChange={update("degree")} autoComplete="off" />
        </label>

        <label className="field">
          <span>Graduation year</span>
          <input value={fields.year} onChange={update("year")} inputMode="numeric" autoComplete="off" />
        </label>

        <div className="tamper-actions">
          <button className="btn btn-primary" onClick={swapOneLetter} type="button">
            <Shuffle size={16} />
            Change one letter
          </button>

          <button
            className="btn btn-ghost"
            onClick={() => setFields(ORIGINAL)}
            disabled={same}
            type="button"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      <div className="tamper-result card">
        <div className="tamper-prints">
          <figure>
            <Fingerprint
              hash={originalHash}
              size={128}
              state="valid"
              label="Fingerprint of the registered diploma"
            />
            <figcaption>
              <strong>Registered record</strong>
              <code>{shortHash(originalHash)}</code>
            </figcaption>
          </figure>

          <span className={same ? "tamper-eq is-ok" : "tamper-eq is-bad"} aria-hidden="true">
            {same ? <Check size={20} /> : <X size={20} />}
          </span>

          <figure>
            <Fingerprint
              hash={hash}
              size={128}
              state={same ? "valid" : "missing"}
              label="Fingerprint of your edited copy"
            />
            <figcaption>
              <strong>Your copy</strong>
              <code>{shortHash(hash)}</code>
            </figcaption>
          </figure>
        </div>

        <div className="bitgrid" role="img" aria-label={`${bits} of 256 bits differ from the registered record`}>
          {map.map((changed, index) => (
            <i key={index} className={changed ? "is-changed" : ""} />
          ))}
        </div>

        <p className={same ? "verdict verdict-ok" : "verdict verdict-bad"} role="status">
          {same ? (
            <>
              <ShieldCheck size={18} />
              Identical. This copy would pass verification.
            </>
          ) : (
            <>
              <X size={18} />
              {bits} of 256 bits changed. This copy would fail verification.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function ChainVisual({ step, sample }) {
  if (step === "issue") {
    return (
      <div className="visual visual-issue">
        <span className="doc" aria-hidden="true">
          <FileText size={30} />
          <i /><i /><i />
        </span>
        <ArrowRight size={22} className="visual-arrow" aria-hidden="true" />
        <Fingerprint hash={sample} size={96} label="Sample document fingerprint" />
      </div>
    );
  }

  if (step === "anchor") {
    return (
      <div className="visual visual-anchor">
        <span className="block"><Blocks size={20} /><small>Block n−1</small></span>
        <span className="block-link" aria-hidden="true" />
        <span className="block block-new">
          <Fingerprint hash={sample} size={42} decorative />
          <small>Your diploma</small>
          <code>{shortHash(sample, 4, 4)}</code>
        </span>
        <span className="block-link" aria-hidden="true" />
        <span className="block"><Blocks size={20} /><small>Block n+1</small></span>
      </div>
    );
  }

  return (
    <div className="visual visual-check">
      <Fingerprint hash={sample} size={92} state="valid" label="Fingerprint of the copy you hold" />
      <span className="tamper-eq is-ok" aria-hidden="true"><Check size={20} /></span>
      <Fingerprint hash={sample} size={92} state="valid" label="Fingerprint stored on the blockchain" />
    </div>
  );
}

function ProofTabs() {
  const [index, setIndex] = useState(0);
  const sample = useSampleHash();
  const refs = useRef([]);

  const move = (next) => {
    const target = (next + proofSteps.length) % proofSteps.length;
    setIndex(target);
    refs.current[target]?.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight") { event.preventDefault(); move(index + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(index - 1); }
  };

  const step = proofSteps[index];

  return (
    <div className="proof card">
      <div className="proof-tabs" role="tablist" aria-label="How a diploma becomes proof" onKeyDown={onKeyDown}>
        {proofSteps.map((item, i) => (
          <button
            key={item.id}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={i === index}
            aria-controls={`panel-${item.id}`}
            tabIndex={i === index ? 0 : -1}
            className={i === index ? "is-active" : ""}
            onClick={() => setIndex(i)}
          >
            <span className="step-index">{i + 1}</span>
            {item.tab}
          </button>
        ))}
      </div>

      <div className="proof-panel" role="tabpanel" id={`panel-${step.id}`} aria-labelledby={`tab-${step.id}`} tabIndex={0}>
        <div>
          <h3>{step.title}</h3>
          <p>{step.text}</p>

          {index < proofSteps.length - 1 ? (
            <button className="btn-text" onClick={() => setIndex(index + 1)}>
              Next: {proofSteps[index + 1].tab}
              <ArrowRight size={14} />
            </button>
          ) : (
            <Link className="btn-text" to="/verify">
              Try it with a real diploma
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        <ChainVisual step={step.id} sample={sample} />
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const sample = useSampleHash();

  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function handleFile(file) {
    if (!file) return;

    if (!isPdf(file)) {
      setError("That file isn't a PDF. Choose the diploma as a .pdf file.");
      return;
    }

    setError("");
    navigate("/verify", { state: { file } });
  }

  const mood = error ? "error" : dragging ? "thinking" : "happy";
  const message = error
    ? "I can only read PDF diplomas."
    : dragging
      ? "Let go and I'll check it."
      : "Drop a diploma PDF and I'll check it against the chain.";

  return (
    <div className="landing">
      <header className="land-nav">
        <Brand />

        <nav className="land-links" aria-label="Sections">
          <a href="#try-it">Try It</a>
          <a href="#how">How It Works</a>
          <a href="#faq">FAQ</a>
        </nav>

        <Link to="/verify" className="btn btn-primary btn-sm">
          Verify a diploma
        </Link>
      </header>

      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">
              Is that diploma real?
              <br />
              Find out in seconds.
            </h1>

            <p className="lead">
              Drop the PDF. Your device fingerprints it and checks the
              university's record on Ethereum. No account, no wallet, no upload.
            </p>

            <label
              className={`hero-drop ${dragging ? "is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                handleFile(event.dataTransfer.files?.[0]);
              }}
            >
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="file-input"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />

              <span className="hero-drop-print" aria-hidden="true">
                <Fingerprint hash={sample} size={64} animate={false} decorative />
              </span>

              <span className="hero-drop-text">
                <strong>Drop a diploma PDF here</strong>
                <span>or click to choose a file</span>
              </span>

              <span className="btn btn-primary hero-drop-btn" aria-hidden="true">
                <ScanLine size={17} />
                Scan it
              </span>
            </label>

            {error ? (
              <p className="hero-note hero-note-error" role="alert">{error}</p>
            ) : (
              <p className="hero-note">
                <Lock size={15} />
                Stays on your device. Only the fingerprint is checked.
              </p>
            )}

            <p className="hero-alt">
              Issuing diplomas?{" "}
              <Link to="/admin">Open the university dashboard</Link>
            </p>
          </div>

          <div className="hero-stage glass">
            <VeriMascot size={300} mood={mood} message={message} />

            <div className="stage-chips">
              <div className="stage-chip">
                <Fingerprint hash={sample} size={30} decorative animate={false} />
                <div>
                  <strong>Sample fingerprint</strong>
                  <code>{shortHash(sample)}</code>
                </div>
              </div>

              <div className="stage-chip">
                <span className="chip-icon chip-ok"><ShieldCheck size={18} /></span>
                <div>
                  <strong>Valid</strong>
                  <span>Matches the Sepolia record</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section container" id="try-it" aria-labelledby="try-title">
          <div className="section-head">
            <h2 id="try-title">Change one letter. Watch the fingerprint change.</h2>
            <p>
              Every diploma has a unique fingerprint. Edit the details below
              and see why a forged copy can't pass.
            </p>
          </div>

          <TamperDemo />
        </section>

        <section className="section container" id="how" aria-labelledby="how-title">
          <div className="section-head">
            <h2 id="how-title">From diploma to proof in three steps</h2>
          </div>

          <ProofTabs />
        </section>

        <section className="section container" aria-labelledby="who-title">
          <div className="section-head">
            <h2 id="who-title">Where would you like to start?</h2>
          </div>

          <div className="access-grid">
            <article className="access-card glass">
              <h3>I need to check a diploma</h3>
              <p>See the holder, the qualification and whether it is still valid. Open to everyone.</p>
              <Link to="/verify" className="btn btn-primary">
                Verify a diploma
                <ArrowRight size={17} />
              </Link>
            </article>

            <article className="access-card glass">
              <h3>I issue diplomas</h3>
              <p>Register graduates, browse the registry and revoke credentials with the owner's MetaMask wallet.</p>
              <Link to="/admin" className="btn btn-ghost">
                Open the dashboard
                <ArrowRight size={17} />
              </Link>
            </article>
          </div>
        </section>

        <section className="section container faq" id="faq" aria-labelledby="faq-title">
          <div className="section-head">
            <h2 id="faq-title">Questions, answered</h2>
          </div>

          <div className="faq-list">
            {faqs.map((item) => (
              <details key={item.q} className="faq-item glass">
                <summary>
                  {item.q}
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="land-footer container">
        <Brand />
        <span>Blockchain-based academic certification</span>
        <a href={EXPLORER_ADDRESS + CONTRACT_ADDRESS} target="_blank" rel="noreferrer">
          View the smart contract on Etherscan
        </a>
      </footer>
    </div>
  );
}
