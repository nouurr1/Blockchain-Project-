import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import {
  LayoutDashboard,
  FilePlus2,
  FileClock,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Download,
  FileText,
  X,
  Ban,
  CheckCircle2,
  Info,
  Loader2,
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  Layers,
  Link2
} from "lucide-react";

import Brand from "../components/Brand";
import Fingerprint from "../components/Fingerprint";
import VeriMascot from "../components/VeriMascot";
import { shortHash } from "../lib/fingerprint";
import {
  connectWallet,
  calculatePdfHash,
  CONTRACT_ADDRESS,
  DEPLOYMENT_TX_HASH
} from "../contract";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

const ETHERSCAN_URL = "https://sepolia.etherscan.io/tx/";
const EXPLORER_ADDRESS = "https://sepolia.etherscan.io/address/";
const OWNER_ADDRESS = "0x43bcC06290B3591f5c131D9badDeae832cD4dAF2";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" }
  }
};

const pageMeta = {
  overview: {
    title: "Overview",
    text: "Your diploma registry at a glance."
  },
  issue: {
    title: "Issue a Diploma",
    text: "Register a graduate's diploma on the blockchain."
  },
  revoke: {
    title: "Revoke a Diploma",
    text: "Withdraw a credential that should no longer be valid."
  },
  history: {
    title: "Diploma Registry",
    text: "Every credential registered by this contract."
  }
};

const issueSteps = [
  "Fingerprint the PDF",
  "Store the PDF on IPFS",
  "Confirm in MetaMask",
  "Wait for Ethereum"
];

/** Moves focus into a dialog, traps Tab, closes on Escape, restores focus after. */
function useDialog(open, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const previous = document.activeElement;
    const node = ref.current;

    const focusable = () =>
      Array.from(
        node?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      );

    focusable()[0]?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusable();
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  return ref;
}

function StatusBadge({ valid }) {
  return (
    <span className={valid ? "badge badge-ok" : "badge badge-bad"}>
      {valid ? "Valid" : "Revoked"}
    </span>
  );
}

function FilePicker({ id, title, hint, file, onChange }) {
  return (
    <label className="file-picker" htmlFor={id}>
      <span className="chip-icon chip-lg">
        {file ? <FileText size={22} /> : <UploadCloud size={22} />}
      </span>

      <span className="file-picker-text">
        <strong>{file ? file.name : title}</strong>
        <small>
          {file
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Click to change`
            : hint}
        </small>
      </span>

      <input
        id={id}
        className="file-input"
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        required
      />
    </label>
  );
}

export default function AdminDashboard() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("admin@veritas-university.test");
  const [adminPassword, setAdminPassword] = useState("");
  const [authToken, setAuthToken] = useState(
    () => sessionStorage.getItem("veritasAdminToken") || ""
);

const isAuthenticated = Boolean(authToken);

  const [activeTab, setActiveTab] = useState("overview");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [degree, setDegree] = useState("");
  const [year, setYear] = useState("2026");
  const [diplomaFile, setDiplomaFile] = useState(null);

  const [revokeFile, setRevokeFile] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedDiploma, setSelectedDiploma] = useState(null);
  const [lastIssued, setLastIssued] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [justIssued, setJustIssued] = useState(false);
  const [phase, setPhase] = useState(0);
  const [issueHash, setIssueHash] = useState("");
  const [revokePreview, setRevokePreview] = useState(null);

  const confirmRef = useDialog(confirmRevoke, () => setConfirmRevoke(false));
  const certificateRef = useDialog(Boolean(selectedDiploma), () =>
    setSelectedDiploma(null)
  );

  useEffect(() => {
    if (!loading) setPhase(0);
  }, [loading]);

  // Live fingerprint of the PDF chosen on the Issue tab.
  useEffect(() => {
    let live = true;

    if (!diplomaFile) {
      setIssueHash("");
      return undefined;
    }

    setIssueHash("");
    calculatePdfHash(diplomaFile)
      .then((value) => live && setIssueHash(value))
      .catch(() => live && setIssueHash(""));

    return () => {
      live = false;
    };
  }, [diplomaFile]);

  // Look up whose diploma the chosen revoke PDF is, before anything is signed.
  useEffect(() => {
    let live = true;

    if (!revokeFile || !contract) {
      setRevokePreview(null);
      return undefined;
    }

    setRevokePreview({ status: "loading" });

    calculatePdfHash(revokeFile)
      .then(async (hash) => {
        const record = await contract.verifierDiplome(hash);
        if (!live) return;

        setRevokePreview(
          record.trouve
            ? {
                status: record.valide ? "valid" : "revoked",
                hash,
                name: record.nomEtudiant,
                degree: record.filiere,
                year: record.annee.toString()
              }
            : { status: "missing", hash }
        );
      })
      .catch(() => live && setRevokePreview({ status: "error" }));

    return () => {
      live = false;
    };
  }, [revokeFile, contract]);

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };
  async function handleAdminLogin(event) {
  event.preventDefault();

  try {
    setLoading(true);
    showMessage("Checking administrator credentials...");

    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: adminEmail.trim(),
        password: adminPassword
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.token) {
      throw new Error(data.error || "Admin login failed.");
    }

    sessionStorage.setItem("veritasAdminToken", data.token);
    setAuthToken(data.token);
    setAdminPassword("");

    showMessage(
      "Login successful. Now connect the university wallet.",
      "success"
    );
  } catch (error) {
    showMessage(error.message || "Admin login failed.", "error");
  } finally {
    setLoading(false);
  }
}

function handleAdminLogout() {
  sessionStorage.removeItem("veritasAdminToken");
  setAuthToken("");
  setAdminPassword("");
  setAccount("");
  setContract(null);
  setIsAdmin(false);
  showMessage("You have logged out.", "info");
}

  const shortAddress = (value) =>
    value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "";

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === "0") return "Not available";

    return new Date(Number(timestamp) * 1000).toLocaleDateString(
      undefined,
      {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    );
  };

  const stats = useMemo(() => {
    const total = history.length;
    const valid = history.filter((item) => item.valid).length;
    const revoked = total - valid;

    return { total, valid, revoked };
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.degree.toLowerCase().includes(search.toLowerCase()) ||
        item.hash.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "valid" && item.valid) ||
        (filter === "revoked" && !item.valid);

      return matchesSearch && matchesFilter;
    });
  }, [history, search, filter]);

  async function handleConnect() {
      if (!authToken) {
    showMessage(
      "Please log in with your administrator email and password first.",
      "error"
    );
    return;
  }
    try {
      setLoading(true);
      showMessage("Connecting to the university wallet...");

      const { signer, contract: connectedContract } =
        await connectWallet();

      const walletAddress = await signer.getAddress();
      const ownerAddress = await connectedContract.owner();

      setAccount(walletAddress);
      setContract(connectedContract);

      const ownerMatch =
        walletAddress.toLowerCase() === ownerAddress.toLowerCase();

      setIsAdmin(ownerMatch);

      if (ownerMatch) {
        showMessage(
          "University administrator access confirmed.",
          "success"
        );

        await loadHistory(connectedContract);
      } else {
        showMessage(
          "This wallet is not the registered contract owner.",
          "error"
        );
      }
    } catch (error) {
      showMessage(
        error.shortMessage || error.message || "Wallet connection failed.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(activeContract = contract) {
    if (!activeContract) return;

    try {
      setLoading(true);
      showMessage("Loading blockchain diploma records...");

      const provider = activeContract.runner.provider;

      const deploymentReceipt =
        await provider.getTransactionReceipt(DEPLOYMENT_TX_HASH);

      if (!deploymentReceipt) {
        throw new Error("Contract deployment transaction was not found.");
      }

      const startBlock = deploymentReceipt.blockNumber;
      const latestBlock = await provider.getBlockNumber();
      let batchSize = 9000; // most RPC nodes cap eth_getLogs at 10,000 blocks

      const records = new Map();

      let fromBlock = startBlock;

      while (fromBlock <= latestBlock) {
        const toBlock = Math.min(fromBlock + batchSize - 1, latestBlock);

        let issuedEvents;

        try {
          issuedEvents = await activeContract.queryFilter(
            activeContract.filters.DiplomeEmis(),
            fromBlock,
            toBlock
          );
        } catch (rangeError) {
          // Node rejected the range: retry the same start with a smaller window.
          if (batchSize > 500) {
            batchSize = Math.floor(batchSize / 2);
            continue;
          }

          throw rangeError;
        }

        fromBlock = toBlock + 1;

        for (const log of issuedEvents) {
          const hash = log.args.hashPdf;

          const record =
            await activeContract.verifierDiplome(hash);

          const block = await provider.getBlock(log.blockNumber);

          records.set(hash, {
            hash,
            name: record.nomEtudiant,
            degree: record.filiere,
            year: record.annee.toString(),
            cid: record.cid,
            date: record.dateEmission.toString(),
            valid: record.valide,
            transactionHash: log.transactionHash,
            blockTimestamp: block?.timestamp || 0
          });
        }
      }

      const result = Array.from(records.values()).reverse();

      setHistory(result);
      showMessage(
        `${result.length} ${result.length === 1 ? "diploma" : "diplomas"} loaded.`,
        "success"
      );
    } catch (error) {
      showMessage(
        error.message || "Unable to load diploma history.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleIssue(event) {
    event.preventDefault();

    if (!contract || !isAdmin) {
      showMessage("Connect the university owner wallet first.", "error");
      return;
    }

    if (
      !diplomaFile ||
      !firstName.trim() ||
      !lastName.trim() ||
      !degree.trim() ||
      !year
    ) {
      showMessage("Please complete all fields.", "error");
      return;
    }

    if (
      diplomaFile.type !== "application/pdf" &&
      !diplomaFile.name.toLowerCase().endsWith(".pdf")
    ) {
      showMessage("Please select a PDF document.", "error");
      return;
    }

    try {
      setLoading(true);

      setPhase(1);
      showMessage("Calculating the SHA-256 document fingerprint...");

      const hash = await calculatePdfHash(diplomaFile);
      const studentName =
        `${firstName.trim()} ${lastName.trim()}`;

      setPhase(2);
      showMessage(
        "Sign the upload request in MetaMask. It proves you're the owner and costs no gas."
      );

      const timestamp = Date.now().toString();
      const signature = await contract.runner.signMessage(
        `VERITAS upload ${timestamp}`
      );

      showMessage("Uploading the PDF to IPFS...");

      const formData = new FormData();
      formData.append("file", diplomaFile);

      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Veritas-Timestamp": timestamp,
          "X-Veritas-Signature": signature
},
        body: formData
      });

      const uploadData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          uploadData.error || "IPFS upload failed."
        );
      }

      if (!uploadData.cid) {
        throw new Error("The IPFS server did not return a CID.");
      }

      setPhase(3);
      showMessage("Submitting the diploma to Ethereum Sepolia...");

      const transaction = await contract.emettreDiplome(
        hash,
        studentName,
        degree.trim(),
        Number(year),
        uploadData.cid
      );

      setPhase(4);
      showMessage("Transaction submitted. Waiting for confirmation...");

      await transaction.wait();

      const issuedDiploma = {
        hash,
        name: studentName,
        degree: degree.trim(),
        year,
        cid: uploadData.cid,
        valid: true,
        transactionHash: transaction.hash,
        date: Math.floor(Date.now() / 1000).toString()
      };

      setLastIssued(issuedDiploma);
      setJustIssued(true);

      setFirstName("");
      setLastName("");
      setDegree("");
      setYear("2026");
      setDiplomaFile(null);

      setFormKey((key) => key + 1);

      showMessage(
        "Diploma registered on the blockchain.",
        "success"
      );

      await loadHistory(contract);
    } catch (error) {
      showMessage(
        error.shortMessage || error.message || "Issuance failed.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRevoke(event) {
    event.preventDefault();

    if (!contract || !isAdmin || !revokeFile) {
      showMessage(
        "Connect the owner wallet and choose the original PDF.",
        "error"
      );
      return;
    }

    if (
      revokeFile.type !== "application/pdf" &&
      !revokeFile.name.toLowerCase().endsWith(".pdf")
    ) {
      showMessage("Please select a PDF document.", "error");
      return;
    }

    setConfirmRevoke(true);
  }

  async function performRevoke() {
    setConfirmRevoke(false);

    try {
      setLoading(true);

      showMessage("Calculating the PDF fingerprint...");

      const hash = await calculatePdfHash(revokeFile);

      showMessage("Checking the blockchain record...");

      const record = await contract.verifierDiplome(hash);

      if (!record.trouve) {
        throw new Error("No registered diploma matches this PDF.");
      }

      if (!record.valide) {
        throw new Error("This diploma has already been revoked.");
      }

      showMessage("Submitting the revocation transaction...");

      const transaction = await contract.revoquerDiplome(hash);

      await transaction.wait();

      setRevokeFile(null);
      setFormKey((key) => key + 1);

      showMessage(
        `Diploma revoked. Transaction: ${transaction.hash}`,
        "success"
      );

      await loadHistory(contract);
    } catch (error) {
      showMessage(
        error.shortMessage || error.message || "Revocation failed.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyProofLink(item) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/verify?hash=${item.hash}`
      );
      showMessage(
        "Proof link copied. Anyone can open it to verify this diploma.",
        "success"
      );
    } catch {
      showMessage("Couldn't copy the link. Try again.", "error");
    }
  }

  function openCertificate(item) {
    setSelectedDiploma(item);
  }

  async function copyHash(hash) {
    try {
      await navigator.clipboard.writeText(hash);
      showMessage("Document fingerprint copied.", "success");
    } catch {
      showMessage("Couldn't copy. Select the fingerprint and copy it manually.", "error");
    }
  }

  function downloadCertificate() {
    window.print();
  }

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = () => {
      setAccount("");
      setContract(null);
      setIsAdmin(false);
      setHistory([]);
      showMessage("Wallet changed. Please reconnect.", "info");
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
    };
  }, []);

  const navigation = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "issue", label: "Issue Diploma", icon: FilePlus2 },
    { id: "revoke", label: "Revoke Diploma", icon: ShieldAlert },
    { id: "history", label: "Registry", icon: FileClock }
  ];

  const verificationUrl = (item) =>
    `${window.location.origin}/verify?hash=${item.hash}`;

  const meta = pageMeta[activeTab];

  const mascotMood = loading
    ? "thinking"
    : messageType === "error"
      ? "error"
      : messageType === "success"
        ? "success"
        : "happy";

  const mascotMessage = loading
    ? "Working on it. Keep this tab open."
    : messageType === "error"
      ? "Something needs attention. Details are above."
      : messageType === "success"
        ? "Done. The registry is up to date."
        : isAdmin
          ? "Welcome back, administrator."
          : "Connect the university wallet to begin.";

  function renderTable(items, compact = false) {
    return (
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Graduate</th>
              {!compact && <th scope="col">Year</th>}
              <th scope="col">Status</th>
              {!compact && <th scope="col">Registered</th>}
              <th scope="col" className="table-actions-head">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.hash}>
                <td>
                  <div className="person">
                    <span className="print-avatar">
                      <Fingerprint hash={item.hash} size={24} decorative animate={false} />
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.degree}</span>
                    </div>
                  </div>
                </td>
                {!compact && <td>{item.year}</td>}
                <td>
                  <StatusBadge valid={item.valid} />
                </td>
                {!compact && <td>{formatDate(item.date)}</td>}
                <td>
                  <div className="row-actions">
                    {item.transactionHash && (
                      <a
                        className="icon-button"
                        href={ETHERSCAN_URL + item.transactionHash}
                        target="_blank"
                        rel="noreferrer"
                        title="View transaction on Etherscan"
                        aria-label={`View ${item.name}'s transaction on Etherscan`}
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <button
                      className="icon-button"
                      onClick={() => copyProofLink(item)}
                      title="Copy proof link"
                      aria-label={`Copy ${item.name}'s proof link`}
                    >
                      <Link2 size={16} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => openCertificate(item)}
                      title="Preview certificate"
                      aria-label={`Preview ${item.name}'s certificate`}
                    >
                      <FileText size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="dash">
      <aside className="dash-sidebar" aria-label="Dashboard menu">
        <Brand />
        <div className="sidebar-rule" />

        <nav className="dash-nav" aria-label="Dashboard">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;

            return (
              <button
                key={item.id}
                className={active ? "nav-item is-active" : "nav-item"}
                onClick={() => {
                  setActiveTab(item.id);
                  setJustIssued(false);
                }}
                aria-current={active ? "page" : undefined}
              >
                <span className="nav-icon">
                  <Icon size={16} />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <span className="sidebar-card-icon">
            <ShieldCheck size={20} />
          </span>
          <strong>{isAdmin ? "Owner verified" : "Not connected"}</strong>
          <p>
            Only the contract owner's wallet can issue or revoke diplomas.
          </p>
          <a
            href={EXPLORER_ADDRESS + CONTRACT_ADDRESS}
            target="_blank"
            rel="noreferrer"
            className="sidebar-card-link"
          >
            View contract
            <ExternalLink size={13} />
          </a>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <div className="dash-title">
            <p className="crumbs">Admin / {meta.title}</p>
            <h1>{meta.title}</h1>
            <p className="dash-lede">{meta.text}</p>
          </div>

          <div className="topbar-actions">
            <span className="net-pill">
              <span className="dot" />
              Sepolia
            </span>

            <button
              className={account ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm"}
              onClick={handleConnect}
              disabled={loading}
            >
              <Wallet size={16} />
              {account ? shortAddress(account) : "Connect wallet"}
            </button>

            <Link to="/" className="icon-button" title="Back to the home page" aria-label="Back to the home page">
              <ArrowLeft size={17} />
            </Link>
          </div>
        </header>

        <div className="dash-body">
          <motion.main
            id="main"
            className="dash-content"
            key={activeTab}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            {message && (
              <div className={`alert alert-${messageType}`} role="status">
                {loading ? (
                  <Loader2 size={17} className="spin" />
                ) : messageType === "success" ? (
                  <CheckCircle2 size={17} />
                ) : messageType === "error" ? (
                  <ShieldAlert size={17} />
                ) : (
                  <Info size={17} />
                )}
                <span>{message}</span>
              </div>
            )}

            {!isAuthenticated ? (
  <section className="card gate">
    <span className="chip-icon chip-xl">
      <ShieldCheck size={26} />
    </span>

    <h2>VERITAS administrator login</h2>

    <p>
      Sign in with your administrator email and password.
      You will then connect the university wallet.
    </p>

    <form onSubmit={handleAdminLogin} className="admin-login-form">
      <label htmlFor="admin-email">Admin email</label>

      <input
        id="admin-email"
        type="email"
        autoComplete="username"
        value={adminEmail}
        onChange={(event) => setAdminEmail(event.target.value)}
        required
      />

      <label htmlFor="admin-password">Password</label>

      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        value={adminPassword}
        onChange={(event) => setAdminPassword(event.target.value)}
        required
      />

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
      >
        <ShieldCheck size={17} /> Sign in
      </button>
    </form>
  </section>
) : !isAdmin ? (
              <section className="card gate">
                <span className="chip-icon chip-xl">
                  <Wallet size={26} />
                </span>

                <h2>Connect the university wallet</h2>

                <p>
                  Open MetaMask with the account that deployed the VERITAS
                  contract. Only that account can issue or revoke diplomas.
                </p>

                {isAuthenticated && (
  <>
    <button
      className={account ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm"}
      onClick={handleConnect}
      disabled={loading}
    >
      <Wallet size={16} />
      {account ? shortAddress(account) : "Connect wallet"}
    </button>

    <button
      className="btn btn-ghost btn-sm"
      onClick={handleAdminLogout}
      disabled={loading}
    >
      Log out
    </button>
  </>
)}

                <div className="owner-ref">
                  <span>Contract owner</span>
                  <code>{OWNER_ADDRESS}</code>
                </div>
              </section>
            ) : (
              <>
                {activeTab === "overview" && (
                  <>
                    <section className="card next-action">
                      <div>
                        <h2>Ready to issue the next diploma?</h2>
                        <p>
                          Fingerprint a PDF, register it on Ethereum, then share
                          a proof link anyone can open.
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => setActiveTab("issue")}
                        >
                          <FilePlus2 size={17} />
                          Issue a diploma
                        </button>
                      </div>
                      <Fingerprint
                        hash={history[0]?.hash || "0x7c1e5b"}
                        size={96}
                        decorative
                      />
                    </section>

                    <section className="stats">
                      <article className="card stat">
                        <div>
                          <p>Total diplomas</p>
                          <strong>{stats.total}</strong>
                        </div>
                        <span className="chip-icon chip-lg">
                          <Layers size={21} />
                        </span>
                      </article>

                      <article className="card stat">
                        <div>
                          <p>Valid</p>
                          <strong>{stats.valid}</strong>
                        </div>
                        <span className="chip-icon chip-lg chip-ok">
                          <ShieldCheck size={21} />
                        </span>
                      </article>

                      <article className="card stat">
                        <div>
                          <p>Revoked</p>
                          <strong>{stats.revoked}</strong>
                        </div>
                        <span className="chip-icon chip-lg chip-bad">
                          <Ban size={21} />
                        </span>
                      </article>
                    </section>

                    <section className="overview-grid">
                      <div className="card">
                        <div className="card-head">
                          <h2>Recent diplomas</h2>
                          <button
                            className="btn-text"
                            onClick={() => setActiveTab("history")}
                          >
                            View all
                            <ArrowRight size={14} />
                          </button>
                        </div>

                        {history.length === 0 ? (
                          <div className="empty">
                            <FileClock size={22} />
                            <p>
                              No diplomas registered yet. Issue the first one
                              or refresh the registry.
                            </p>
                          </div>
                        ) : (
                          renderTable(history.slice(0, 5), true)
                        )}
                      </div>

                      <div className="card quick">
                        <h2>Quick actions</h2>

                        <button className="quick-item" onClick={() => setActiveTab("issue")}>
                          <span className="chip-icon">
                            <FilePlus2 size={18} />
                          </span>
                          <div>
                            <strong>Issue a diploma</strong>
                            <small>Register a new graduate</small>
                          </div>
                        </button>

                        <button className="quick-item" onClick={() => setActiveTab("revoke")}>
                          <span className="chip-icon chip-bad">
                            <ShieldAlert size={18} />
                          </span>
                          <div>
                            <strong>Revoke a diploma</strong>
                            <small>Withdraw an existing record</small>
                          </div>
                        </button>

                        <button
                          className="quick-item"
                          onClick={() => loadHistory(contract)}
                          disabled={loading}
                        >
                          <span className="chip-icon">
                            <RefreshCw size={18} />
                          </span>
                          <div>
                            <strong>Refresh registry</strong>
                            <small>Fetch the latest on-chain records</small>
                          </div>
                        </button>
                      </div>
                    </section>

                    {lastIssued && (
                      <section className="card latest">
                        <div>
                          <h2>{lastIssued.name}</h2>
                          <p>
                            {lastIssued.degree}, {lastIssued.year} · just registered
                          </p>
                        </div>

                        <button
                          className="btn btn-ghost"
                          onClick={() => openCertificate(lastIssued)}
                        >
                          <FileText size={16} />
                          Preview certificate
                        </button>
                      </section>
                    )}
                  </>
                )}

                {activeTab === "issue" && (
                  justIssued && lastIssued ? (
                    <section className="card success-card" aria-labelledby="issued-title">
                      <Fingerprint hash={lastIssued.hash} size={104} state="valid" label="Fingerprint of the registered diploma" />

                      <div>
                        <h2 id="issued-title">Diploma registered</h2>
                        <p className="success-name">
                          {lastIssued.name} · {lastIssued.degree}, {lastIssued.year}
                        </p>
                        <p className="card-sub">
                          It's on Ethereum now. Share the proof link so anyone can verify it.
                        </p>

                        <div className="success-actions">
                          <button className="btn btn-primary" onClick={() => copyProofLink(lastIssued)}>
                            <Link2 size={16} />
                            Copy proof link
                          </button>
                          <button className="btn btn-ghost" onClick={() => openCertificate(lastIssued)}>
                            <FileText size={16} />
                            Preview certificate
                          </button>
                          <button className="btn-text" onClick={() => setJustIssued(false)}>
                            Issue another diploma
                          </button>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="card form-card">
                      <form key={formKey} onSubmit={handleIssue}>
                      <div className="form-grid">
                        <label className="field">
                          <span>First name</span>
                          <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Student's first name"
                            autoComplete="off"
                            required
                          />
                        </label>

                        <label className="field">
                          <span>Last name</span>
                          <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Student's last name"
                            autoComplete="off"
                            required
                          />
                        </label>

                        <label className="field">
                          <span>Degree or field of study</span>
                          <input
                            value={degree}
                            onChange={(e) => setDegree(e.target.value)}
                            placeholder="e.g. Computer Science"
                            autoComplete="off"
                            required
                          />
                        </label>

                        <label className="field">
                          <span>Graduation year</span>
                          <input
                            type="number"
                            min="1900"
                            max="2100"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            required
                          />
                        </label>
                      </div>

                        <FilePicker
                          id="diploma-file"
                          title="Choose the diploma PDF"
                          hint="We fingerprint it here and store it on IPFS."
                          file={diplomaFile}
                          onChange={setDiplomaFile}
                        />

                        {diplomaFile && (
                          <div className="print-preview" aria-live="polite">
                            <Fingerprint
                              hash={issueHash}
                              size={72}
                              state={issueHash ? "idle" : "scanning"}
                              label="Fingerprint of the chosen PDF"
                            />
                            <div>
                              <strong>
                                {issueHash ? "Fingerprint ready" : "Fingerprinting…"}
                              </strong>
                              {issueHash && <code>{shortHash(issueHash, 10, 8)}</code>}
                              <span>This is what gets written to the blockchain.</span>
                            </div>
                          </div>
                        )}

                        {loading && phase > 0 && (
                          <ol className="lookup-steps" aria-label="Registration progress">
                            {issueSteps.map((step, index) => {
                              const number = index + 1;
                              const done = phase > number;
                              const active = phase === number;

                              return (
                                <li key={step} className={done ? "is-done" : active ? "is-active" : ""}>
                                  <span className="lookup-dot">
                                    {done ? <CheckCircle2 size={12} /> : active ? <Loader2 size={12} className="spin" /> : null}
                                  </span>
                                  {step}
                                </li>
                              );
                            })}
                          </ol>
                        )}

                        <p className="form-note">
                          <ShieldCheck size={16} />
                          The fingerprint, graduate details and IPFS address are
                          written to the smart contract. MetaMask will ask you to
                          confirm the transaction.
                        </p>

                        <button className="btn btn-primary" type="submit" disabled={loading}>
                          {loading ? "Registering…" : "Register diploma"}
                          {loading ? <Loader2 size={17} className="spin" /> : <FilePlus2 size={17} />}
                        </button>
                      </form>
                    </section>
                  )
                )}

                {activeTab === "revoke" && (
                  <section className="card form-card form-danger">
                    <form key={formKey} onSubmit={handleRevoke}>
                      <FilePicker
                        id="revoke-file"
                        title="Choose the original diploma PDF"
                        hint="It must be identical to the file that was registered."
                        file={revokeFile}
                        onChange={setRevokeFile}
                      />

                      {revokePreview && (
                        <div className={`revoke-preview rp-${revokePreview.status}`} aria-live="polite">
                          <Fingerprint
                            hash={revokePreview.hash}
                            size={64}
                            state={
                              revokePreview.status === "valid"
                                ? "valid"
                                : revokePreview.status === "revoked"
                                  ? "revoked"
                                  : revokePreview.status === "loading"
                                    ? "scanning"
                                    : "missing"
                            }
                            label="Fingerprint of the chosen PDF"
                          />
                          <div>
                            {revokePreview.status === "loading" && <strong>Looking up this PDF…</strong>}
                            {revokePreview.status === "valid" && (
                              <>
                                <strong>{revokePreview.name}</strong>
                                <span>{revokePreview.degree}, {revokePreview.year}</span>
                                <span>Registered and valid. Revoking will mark it as revoked.</span>
                              </>
                            )}
                            {revokePreview.status === "revoked" && (
                              <>
                                <strong>{revokePreview.name}</strong>
                                <span>This diploma is already revoked. Nothing to do.</span>
                              </>
                            )}
                            {revokePreview.status === "missing" && (
                              <>
                                <strong>No matching diploma</strong>
                                <span>Check that you chose the original registered PDF.</span>
                              </>
                            )}
                            {revokePreview.status === "error" && (
                              <>
                                <strong>Couldn't look this up</strong>
                                <span>Check your connection, then choose the file again.</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="alert alert-warning">
                        <ShieldAlert size={18} />
                        <span>
                          Revocation is written to the blockchain and can't be
                          undone from this app. Employers will see the diploma
                          as revoked.
                        </span>
                      </div>

                      <button
                        className="btn btn-danger"
                        type="submit"
                        disabled={loading || revokePreview?.status !== "valid"}
                      >
                        {loading ? "Revoking…" : "Revoke diploma"}
                        {loading ? <Loader2 size={17} className="spin" /> : <Ban size={17} />}
                      </button>
                    </form>
                  </section>
                )}

                {activeTab === "history" && (
                  <section className="card">
                    <div className="card-head">
                      <div>
                        <h2>All diplomas</h2>
                        <p className="card-sub">{history.length} registered</p>
                      </div>

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => loadHistory(contract)}
                        disabled={loading}
                      >
                        <RefreshCw size={15} className={loading ? "spin" : ""} />
                        Refresh
                      </button>
                    </div>

                    <div className="toolbar">
                      <label className="search">
                        <Search size={17} />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search by name, degree or hash"
                          aria-label="Search diplomas"
                        />
                      </label>

                      <div className="segmented" role="group" aria-label="Filter by status">
                        {[
                          ["all", "All"],
                          ["valid", "Valid"],
                          ["revoked", "Revoked"]
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            className={filter === value ? "is-active" : ""}
                            onClick={() => setFilter(value)}
                            aria-pressed={filter === value}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredHistory.length === 0 ? (
                      <div className="empty">
                        <Search size={22} />
                        <p>No diplomas match your search.</p>
                      </div>
                    ) : (
                      renderTable(filteredHistory)
                    )}
                  </section>
                )}
              </>
            )}
          </motion.main>

          <aside className="dash-rail" aria-label="Assistant">
            <div className="card mascot-card">
              <VeriMascot size={230} mood={mascotMood} message={mascotMessage} />
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {confirmRevoke && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmRevoke(false)}
          >
            <motion.div
              ref={confirmRef}
              className="dialog card"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="revoke-title"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={(event) => event.stopPropagation()}
            >
              <span className="chip-icon chip-lg chip-bad">
                <Ban size={22} />
              </span>
              <h2 id="revoke-title">Revoke this diploma?</h2>
              <p>
                {revokePreview?.name ? `${revokePreview.name}'s diploma` : revokeFile?.name} will be marked as revoked on the blockchain.
                This can't be undone from this app.
              </p>
              <div className="dialog-actions">
                <button className="btn btn-ghost" onClick={() => setConfirmRevoke(false)}>
                  Keep diploma
                </button>
                <button className="btn btn-danger" onClick={performRevoke}>
                  Revoke diploma
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedDiploma && (
          <motion.div
            className="overlay certificate-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDiploma(null)}
          >
            <motion.section
              ref={certificateRef}
              role="dialog"
              aria-modal="true"
              className="certificate-modal"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(event) => event.stopPropagation()}
              aria-label="Certificate preview"
            >
              <div className="certificate-toolbar">
                <span>Certificate preview</span>

                <button
                  className="icon-button"
                  onClick={() => setSelectedDiploma(null)}
                  title="Close preview"
                  aria-label="Close preview"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="certificate-paper" id="certificate-paper">
                <div className="certificate-inner">
                  <div className="certificate-topline">
                    <span>VERITAS</span>
                    <span>Academic registry</span>
                  </div>

                  <div className="certificate-seal">V</div>

                  <p className="certificate-kicker">Certificate of academic achievement</p>

                  <h2>Academic Diploma</h2>

                  <p className="certificate-intro">This digital record confirms that</p>

                  <h3>{selectedDiploma.name}</h3>

                  <p className="certificate-intro">
                    has been awarded the qualification
                  </p>

                  <h4>{selectedDiploma.degree}</h4>

                  <p className="certificate-year">
                    Graduation year {selectedDiploma.year}
                  </p>

                  <div className="certificate-divider" />

                  <div className="certificate-bottom">
                    <dl className="certificate-details">
                      <dt>Registered</dt>
                      <dd>{formatDate(selectedDiploma.date)}</dd>

                      <dt>Status</dt>
                      <dd>{selectedDiploma.valid ? "Valid" : "Revoked"}</dd>

                      <dt>Document fingerprint</dt>
                      <dd>
                        <code>{selectedDiploma.hash}</code>
                      </dd>
                    </dl>

                    <div className="certificate-print">
                      <Fingerprint
                        hash={selectedDiploma.hash}
                        size={78}
                        label="Document fingerprint"
                        animate={false}
                      />
                      <span>Fingerprint</span>
                    </div>

                    <div className="certificate-qr">
                      <QRCodeCanvas
                        value={verificationUrl(selectedDiploma)}
                        size={116}
                        level="H"
                        role="img"
                        aria-label="QR code that opens this diploma's verification page"
                        marginSize={2}
                      />
                      <span>Scan to verify</span>
                    </div>
                  </div>

                  <div className="certificate-footer">
                    Decentralized academic trust · Ethereum Sepolia
                  </div>
                </div>
              </div>

              <div className="certificate-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => copyHash(selectedDiploma.hash)}
                >
                  <Copy size={15} />
                  Copy fingerprint
                </button>

                <button className="btn btn-primary" onClick={downloadCertificate}>
                  <Download size={15} />
                  Print certificate
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
