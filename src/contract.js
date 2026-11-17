
import { ethers } from "ethers";

export const CONTRACT_ADDRESS =
  "0xB5E70a6515467F6e95605A34b2Ea66027E1b38d6";

export const DEPLOYMENT_TX_HASH =
  "0x7a9676f39d8c83cb663cf50cfdce5e085d103c1d59dc72462ee768cdc6385f26";

export const ABI = [
  "function emettreDiplome(bytes32 hashPdf, string nomEtudiant, string filiere, uint256 annee, string cid)",
  "function verifierDiplome(bytes32 hashPdf) view returns (bool trouve, string nomEtudiant, string filiere, uint256 annee, string cid, uint256 dateEmission, bool valide)",
  "function revoquerDiplome(bytes32 hashPdf)",
  "function owner() view returns (address)",
  "event DiplomeEmis(bytes32 indexed hashPdf, string nomEtudiant, string cid)",
  "event DiplomeRevoque(bytes32 indexed hashPdf)"
];

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  await provider.send("eth_requestAccounts", []);

  const network = await provider.getNetwork();

  if (network.chainId !== 11155111n) {
    throw new Error("Please select the Sepolia network in MetaMask.");
  }

  const signer = await provider.getSigner();

  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    ABI,
    signer
  );

  return { provider, signer, contract };
}

export async function calculatePdfHash(file) {
  const fileBytes = await file.arrayBuffer();

  const digest = await crypto.subtle.digest(
    "SHA-256",
    fileBytes
  );

  return (
    "0x" +
    Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function getReadOnlyContract() {
  const provider = new ethers.JsonRpcProvider(
    "https://ethereum-sepolia-rpc.publicnode.com"
  );

  return new ethers.Contract(
    CONTRACT_ADDRESS,
    ABI,
    provider
  );
}
