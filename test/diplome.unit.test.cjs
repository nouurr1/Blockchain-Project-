const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Diplome - Unit Tests", function () {
  let diplome;
  let owner;
  let otherAccount;

  function createHash(name) {
    return ethers.keccak256(ethers.toUtf8Bytes(name));
  }

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();

    const Diplome = await ethers.getContractFactory("Diplome");

    diplome = await Diplome.deploy();

    await diplome.waitForDeployment();
  });

  it("1. Should assign the deployer as owner", async function () {
    expect(await diplome.owner()).to.equal(owner.address);
  });

  it("2. Should reject issuance by a non-owner", async function () {
    const hash = createHash("unauthorized-diploma");

    await expect(
      diplome.connect(otherAccount).emettreDiplome(
        hash,
        "Test Student",
        "Computer Science",
        2026,
        "test-cid"
      )
    ).to.be.revertedWith("Acces reserve a l'universite");
  });

  it("3. Should reject a zero hash", async function () {
    await expect(
      diplome.emettreDiplome(
        ethers.ZeroHash,
        "Test Student",
        "Computer Science",
        2026,
        "test-cid"
      )
    ).to.be.revertedWith("Hash invalide");
  });

  it("4. Should issue a diploma and emit DiplomeEmis", async function () {
    const hash = createHash("diploma-one");

    await expect(
      diplome.emettreDiplome(
        hash,
        "Test Student",
        "Computer Science",
        2026,
        "test-cid"
      )
    )
      .to.emit(diplome, "DiplomeEmis")
      .withArgs(hash, "Test Student", "test-cid");
  });

  it("5. Should store and return diploma information", async function () {
    const hash = createHash("diploma-two");

    await diplome.emettreDiplome(
      hash,
      "Test Student",
      "Computer Science",
      2026,
      "test-cid"
    );

    const result = await diplome.verifierDiplome(hash);

    expect(result.trouve).to.equal(true);
    expect(result.nomEtudiant).to.equal("Test Student");
    expect(result.filiere).to.equal("Computer Science");
    expect(result.annee).to.equal(2026n);
    expect(result.cid).to.equal("test-cid");
    expect(result.dateEmission).to.be.greaterThan(0n);
    expect(result.valide).to.equal(true);
  });

  it("6. Should reject duplicate diploma issuance", async function () {
    const hash = createHash("duplicate-diploma");

    await diplome.emettreDiplome(
      hash,
      "Test Student",
      "Computer Science",
      2026,
      "test-cid"
    );

    await expect(
      diplome.emettreDiplome(
        hash,
        "Another Student",
        "Engineering",
        2026,
        "another-cid"
      )
    ).to.be.revertedWith("Diplome deja emis");
  });

  it("7. Should report an unknown diploma as not found", async function () {
    const hash = createHash("unknown-diploma");

    const result = await diplome.verifierDiplome(hash);

    expect(result.trouve).to.equal(false);
    expect(result.valide).to.equal(false);
  });

  it("8. Should allow the owner to revoke a diploma", async function () {
    const hash = createHash("revoke-diploma");

    await diplome.emettreDiplome(
      hash,
      "Test Student",
      "Computer Science",
      2026,
      "test-cid"
    );

    await expect(diplome.revoquerDiplome(hash))
      .to.emit(diplome, "DiplomeRevoque")
      .withArgs(hash);

    const result = await diplome.verifierDiplome(hash);

    expect(result.trouve).to.equal(true);
    expect(result.valide).to.equal(false);
  });

  it("9. Should reject revocation by a non-owner", async function () {
    const hash = createHash("unauthorized-revocation");

    await diplome.emettreDiplome(
      hash,
      "Test Student",
      "Computer Science",
      2026,
      "test-cid"
    );

    await expect(
      diplome.connect(otherAccount).revoquerDiplome(hash)
    ).to.be.revertedWith("Acces reserve a l'universite");
  });

  it("10. Should reject revocation of an unknown diploma", async function () {
    const hash = createHash("missing-diploma");

    await expect(
      diplome.revoquerDiplome(hash)
    ).to.be.revertedWith("Diplome introuvable");
  });

  it("11. Should reject revoking an already revoked diploma", async function () {
    const hash = createHash("already-revoked");

    await diplome.emettreDiplome(
      hash,
      "Test Student",
      "Computer Science",
      2026,
      "test-cid"
    );

    await diplome.revoquerDiplome(hash);

    await expect(
      diplome.revoquerDiplome(hash)
    ).to.be.revertedWith("Diplome deja revoque");
  });
});