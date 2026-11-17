import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Blocks,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  XCircle
} from "lucide-react";

import Brand from "../components/Brand";
import Fingerprint from "../components/Fingerprint";
import VeriMascot from "../components/VeriMascot";
import {
  calculatePdfHash,
  getReadOnlyContract,
  CONTRACT_ADDRESS
} from "../contract";
import { shortHash } from "../lib/fingerprint";

const EXPLORER_ADDRESS = "https://sepolia.etherscan.io/address/";
const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

const IDLE_MESSAGE = "Drop a diploma PDF and I'll check it against the chain.";

const lookupSteps = ["Fingerprinting the PDF", "Searching Ethereum"];

const isPdf = (file) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

function formatDate(timestamp) {
  if (!timestamp || timestamp === "0") return "Not available";

  return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

const verdicts = {
  valid: {
    title: "Valid diploma",
    text: "This PDF matches a record registered by the university.",
    Icon: CheckCircle2
  },
  revoked: {
    title: "Diploma revoked",
    text: "A record exists, but the university has withdrawn it.",
    Icon: XCircle
  },
  missing: {
    title: "No matching record",
    text: "No record matches this PDF. That doesn't prove fraud, but the document can't be confirmed.",
    Icon: ShieldAlert
  }
};

function ProofChain({ status, result, fromLink }) {
  const found = status !== "missing";

  const nodes = [
    {
      key: "doc",
      icon: <Fingerprint hash={result.hash} size={26} decorative animate={false} />,
      title: fromLink ? "Proof link" : "Your PDF",
      text: shortHash(result.hash)
    },
    {
      key: "chain",
      icon: <Blocks size={20} />,
      title: "Ethereum record",
      text: found ? `Registered ${formatDate(result.date)}` : "Nothing registered"
    },
    {
      key: "person",
      icon: <GraduationCap size={20} />,
      title: "Issued to",
      text: found ? result.name : "Unknown"
    }
  ];

  return (
    <ol className={`chain chain-${status}`} aria-label="Proof chain">
      {nodes.map((node, index) => (
        <li key={node.key} style={{ "--n": index }}>
          <span className="chain-node">{node.icon}</span>
          <div>
            <strong>{node.title}</strong>
            <span>{node.text}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const startedRef = useRef(false);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [docHash, setDocHash] = useState("");
  const [result, setResult] = useState(null);
  const [fromLink, setFromLink] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [mood, setMood] = useState("happy");
  const [message, setMessage] = useState(IDLE_MESSAGE);

  async function checkRecord(documentHash) {
    setDocHash(documentHash);
    setStage(2);
    setMessage("Searching the blockchain…");

    const record = await getReadOnlyContract().verifierDiplome(documentHash);

    if (!record.trouve) {
      setMood("error");
      setMessage("I couldn't find this diploma on the blockchain.");
      setResult({ found: false, hash: documentHash });
      setStage(3);
      return;
    }

    if (record.valide) {
      setMood("success");
      setMessage("Verified. This diploma is authentic and valid.");
    } else {
      setMood("warning");
      setMessage("Careful: this diploma has been revoked.");
    }

    setResult({
      found: true,
      hash: documentHash,
      name: record.nomEtudiant,
      degree: record.filiere,
      year: record.annee.toString(),
      cid: record.cid,
      date: record.dateEmission.toString(),
      valid: record.valide
    });
    setStage(3);
  }

  function failWith(err, fallback) {
    setMood("error");
    setMessage("I couldn't complete the check.");
    setError(err?.shortMessage || err?.message || fallback);
    setStage(0);
  }

  async function verifyFile(selected) {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      setDocHash("");
      setFromLink(false);
      setStage(1);
      setMood("thinking");
      setMessage("Fingerprinting your PDF…");

      // The PDF is hashed inside this browser and never uploaded.
      const documentHash = await calculatePdfHash(selected);
      await checkRecord(documentHash);
    } catch (err) {
      failWith(err, "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function chooseFile(selected) {
    setError("");
    setResult(null);

    if (!selected) return;

    if (!isPdf(selected)) {
      setFile(null);
      setError("That file isn't a PDF. Choose the diploma as a .pdf file.");
      setMood("error");
      setMessage("I can only read PDF diplomas.");
      return;
    }

    setFile(selected);
    verifyFile(selected);
  }

  async function lookupHash(documentHash) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(documentHash)) {
      setError("This proof link isn't valid. Ask the sender for a new one.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);
      setFromLink(true);
      setMood("thinking");
      await checkRecord(documentHash);
    } catch (err) {
      failWith(err, "Couldn't reach Ethereum Sepolia.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (startedRef.current) return;

    const handedOver = location.state?.file;
    const linkedHash = searchParams.get("hash");

    if (handedOver) {
      startedRef.current = true;
      navigate(location.pathname, { replace: true, state: null });
      chooseFile(handedOver);
    } else if (linkedHash) {
      startedRef.current = true;
      lookupHash(linkedHash);
    }
    // Runs once on arrival; handlers are stable for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyText(text, kind) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Couldn't copy. Select the text and copy it manually.");
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
    setStage(0);
    setDocHash("");
    setFromLink(false);
    setMood("happy");
    setMessage("Ready for another one.");

    if (location.search) navigate("/verify", { replace: true });
  }

  const status = !result
    ? null
    : !result.found
      ? "missing"
      : result.valid
        ? "valid"
        : "revoked";

  const proofLink = result
    ? `${window.location.origin}/verify?hash=${result.hash}`
    : "";

  const verdict = status ? verdicts[status] : null;

  return (
    <div className="public">
      <header className="land-nav">
        <Brand />

        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          Home
        </Link>
      </header>

      <main id="main" className="container verify-layout">
        <div className="verify-column">
          <div className="page-title">
            <h1>Verify a Diploma</h1>
            <p>
              Drop the PDF and we'll fingerprint it on your device, then
              compare it with the record on Ethereum. No wallet needed.
            </p>
          </div>

          <section className={`card verify-card ${result ? "has-result" : ""}`} aria-label="Diploma check">
            {!loading && !result && (
              <>
                <label
                  className={`dropzone ${dragging ? "is-dragging" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    chooseFile(event.dataTransfer.files?.[0]);
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="file-input"
                    onChange={(event) => {
                      chooseFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />

                  <Fingerprint size={96} animate={false} decorative />

                  <strong className="dropzone-title">Drop a diploma PDF here</strong>
                  <span className="dropzone-hint">or click to choose a file. We check it as soon as you do.</span>
                  <span className="btn btn-primary" aria-hidden="true">
                    <ScanLine size={17} />
                    Choose PDF
                  </span>
                </label>

                <p className="privacy-note">
                  <Lock size={15} />
                  Your PDF never leaves this device. Only its fingerprint is
                  checked against the blockchain.
                </p>
              </>
            )}

            {loading && (
              <div className="scanner" aria-live="polite">
                <Fingerprint hash={docHash} size={150} state="scanning" label="Fingerprint being scanned" />

                {file && (
                  <p className="scanner-file">
                    <FileText size={16} />
                    {file.name}
                  </p>
                )}

                <ol className="lookup-steps">
                  {lookupSteps.map((step, index) => {
                    const number = index + 1;
                    const done = stage > number;
                    const active = stage === number;

                    return (
                      <li key={step} className={done ? "is-done" : active ? "is-active" : ""}>
                        <span className="lookup-dot">
                          {done ? <Check size={12} /> : active ? <Loader2 size={12} className="spin" /> : null}
                        </span>
                        {step}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {error && (
              <div className="alert alert-error" role="alert">
                <ShieldAlert size={18} />
                <div>
                  <span>{error}</span>
                  {file && !loading && (
                    <button className="btn-text alert-action" onClick={() => verifyFile(file)}>
                      <RefreshCw size={14} />
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="sr-only" role="status">
              {verdict ? `${verdict.title}. ${verdict.text}` : ""}
            </p>

            <AnimatePresence>
              {result && verdict && (
                <motion.section
                  className={`result result-${status}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  aria-labelledby="result-title"
                >
                  <header className="result-banner">
                    <Fingerprint hash={result.hash} size={92} state={status} label={`${verdict.title} fingerprint`} />

                    <div>
                      <h2 id="result-title">
                        <verdict.Icon size={22} aria-hidden="true" />
                        {verdict.title}
                      </h2>
                      <p>{verdict.text}</p>
                    </div>
                  </header>

                  <ProofChain status={status} result={result} fromLink={fromLink} />

                  {result.found && (
                    <dl className="details">
                      <div>
                        <dt>Graduate</dt>
                        <dd>{result.name}</dd>
                      </div>
                      <div>
                        <dt>Qualification</dt>
                        <dd>{result.degree}</dd>
                      </div>
                      <div>
                        <dt>Graduation year</dt>
                        <dd>{result.year}</dd>
                      </div>
                      <div>
                        <dt>Registered on</dt>
                        <dd>{formatDate(result.date)}</dd>
                      </div>
                      <div className="details-wide">
                        <dt>Stored copy (IPFS)</dt>
                        <dd>
                          <a className="inline-link" href={IPFS_GATEWAY + result.cid} target="_blank" rel="noreferrer">
                            <code>{result.cid}</code>
                            <ExternalLink size={13} aria-hidden="true" />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        </dd>
                      </div>
                    </dl>
                  )}

                  {fromLink && (
                    <p className="alert alert-info">
                      <Link2 size={17} aria-hidden="true" />
                      <span>
                        You opened a proof link. To confirm a PDF you hold is
                        the same document, verify it below.
                      </span>
                    </p>
                  )}

                  <div className="hash-box">
                    <div className="hash-head">
                      <span>Document fingerprint (SHA-256)</span>
                      <button className="btn-text" onClick={() => copyText(result.hash, "hash")}>
                        {copied === "hash" ? <Check size={14} /> : <Copy size={14} />}
                        {copied === "hash" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <code>{result.hash}</code>
                  </div>

                  <div className="result-actions">
                    <button className="btn btn-primary" onClick={() => copyText(proofLink, "link")}>
                      {copied === "link" ? <Check size={16} /> : <Link2 size={16} />}
                      {copied === "link" ? "Link copied" : "Copy proof link"}
                    </button>

                    <button className="btn btn-ghost" onClick={reset}>
                      <RefreshCw size={15} />
                      Verify another diploma
                    </button>

                    <a className="btn-text" href={EXPLORER_ADDRESS + CONTRACT_ADDRESS} target="_blank" rel="noreferrer">
                      Smart contract
                      <ExternalLink size={14} aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </section>
        </div>

        <aside className="verify-aside" aria-label="Assistant and help">
          <div className="card mascot-card">
            <VeriMascot size={250} mood={mood} message={message} />
          </div>

          <div className="card how-card">
            <h2>What happens to my file?</h2>
            <p>
              Nothing leaves your device. Your browser turns the PDF into a
              SHA-256 fingerprint, and only that fingerprint is looked up in the
              VERITAS smart contract on Ethereum Sepolia.
            </p>

            <a className="contract-ref" href={EXPLORER_ADDRESS + CONTRACT_ADDRESS} target="_blank" rel="noreferrer">
              <span>Contract</span>
              <code>{CONTRACT_ADDRESS}</code>
            </a>
          </div>
        </aside>
      </main>

      <footer className="land-footer container">
        <Brand />
        <span>Public diploma verification</span>
        <span>Ethereum Sepolia</span>
      </footer>
    </div>
  );
}
