const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const CONTRACT_ADDRESS =
  "0xB5E70a6515467F6e95605A34b2Ea66027E1b38d6";

const ABI = [
  "function emettreDiplome(bytes32 hashPdf, string nomEtudiant, string filiere, uint256 annee, string cid)",
  "function verifierDiplome(bytes32 hashPdf) view returns (bool trouve, string nomEtudiant, string filiere, uint256 annee, string cid, uint256 dateEmission, bool valide)",
  "function revoquerDiplome(bytes32 hashPdf)",
  "function owner() view returns (address)"
];

describe("VERITAS - Deployed Diploma Contract", function () {
  let contract;
  let owner;
  let nonOwner;
  let ownerAddress;
  let counter = 0;

  async function createHash() {
    counter++;

    return ethers.keccak256(
      ethers.toUtf8Bytes(`VERITAS-TEST-${Date.now()}-${counter}`)
    );
  }

  async function issueTestDiploma(hash) {
    const transaction = await contract.emettreDiplome(
      hash,
      "Test Student",
      "Computer Science",
      2026,
      "test-cid-veritas"
    );

    await transaction.wait();
  }

  before(async function () {
    const readContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ABI,
      ethers.provider
    );

    ownerAddress = await readContract.owner();

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ownerAddress]
    });

    await network.provider.send("hardhat_setBalance", [
      ownerAddress,
      ethers.toQuantity(ethers.parseEther("10"))
    ]);

    owner = await ethers.getSigner(ownerAddress);

    contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ABI,
      owner
    );

    const signers = await ethers.getSigners();

    nonOwner = signers.find(
      (signer) =>
        signer.address.toLowerCase() !== ownerAddress.toLowerCase()
    );

    if (!nonOwner) {
      throw new Error("Could not find a non-owner test account.");
    }
  });

  after(async function () {
    if (ownerAddress) {
      await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [ownerAddress]
      });
    }
  });

  it("1. Should recognize the university contract owner", async function () {
    expect(await contract.owner()).to.equal(ownerAddress);
  });

  it("2. Should report an unknown diploma as not found", async function () {
    const hash = await createHash();

    const result = await contract.verifierDiplome(hash);

    expect(result.trouve).to.equal(false);
  });

  it("3. Should issue and retrieve a diploma", async function () {
    const hash = await createHash();

    await issueTestDiploma(hash);

    const result = await contract.verifierDiplome(hash);

    expect(result.trouve).to.equal(true);
    expect(result.nomEtudiant).to.equal("Test Student");
    expect(result.filiere).to.equal("Computer Science");
    expect(result.annee).to.equal(2026n);
    expect(result.cid).to.equal("test-cid-veritas");
    expect(result.valide).to.equal(true);
  });

  it("4. Should revoke an issued diploma", async function () {
    const hash = await createHash();

    await issueTestDiploma(hash);

    const transaction = await contract.revoquerDiplome(hash);
    await transaction.wait();

    const result = await contract.verifierDiplome(hash);

    expect(result.trouve).to.equal(true);
    expect(result.valide).to.equal(false);
  });

  it("5. Should prevent duplicate diploma issuance", async function () {
    const hash = await createHash();

    await issueTestDiploma(hash);

    await expect(
      issueTestDiploma(hash)
    ).to.be.reverted;
  });

  it("6. Should prevent a non-owner from issuing a diploma", async function () {
    const hash = await createHash();

    await expect(
      contract.connect(nonOwner).emettreDiplome(
        hash,
        "Unauthorized Student",
        "Computer Science",
        2026,
        "unauthorized-test-cid"
      )
    ).to.be.reverted;
  });

  it("7. Should prevent a non-owner from revoking a diploma", async function () {
    const hash = await createHash();

    await issueTestDiploma(hash);

    await expect(
      contract.connect(nonOwner).revoquerDiplome(hash)
    ).to.be.reverted;
  });
});