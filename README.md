# \# VERITAS — Blockchain-Based Academic Diploma Verification

# 

# \## 1. Project Overview

# 

# VERITAS is a blockchain-based academic diploma issuance and verification platform.

# 

# The application allows a university to issue digital diplomas and store their cryptographic fingerprints on the Ethereum blockchain. Recruiters can independently verify the authenticity of a diploma by uploading its PDF file to the public verification interface.

# 

# The objective is to make academic certificates more secure, transparent and resistant to forgery.

# 

# \## 2. Project Objectives

# 

# \- Issue academic diplomas through a university administrator interface.

# \- Calculate a SHA-256 fingerprint of each diploma PDF.

# \- Store diploma PDFs using the decentralized IPFS storage system.

# \- Register diploma information and its fingerprint in a Solidity smart contract.

# \- Allow recruiters to verify diplomas without connecting a wallet.

# \- Allow the university contract owner to revoke invalid diplomas.

# 

# \## 3. Technologies Used

# 

# | Component | Technology |

# |---|---|

# | Frontend | React.js |

# | Development and build tool | Vite |

# | Blockchain | Ethereum Sepolia Testnet |

# | Smart contract | Solidity 0.8.34 |

# | Blockchain interaction | Ethers.js |

# | Wallet | MetaMask |

# | Decentralized storage | IPFS / Pinata |

# | Backend | Node.js and Express.js |

# | Administrator authentication | bcryptjs and JSON Web Token |

# | Smart contract testing | Hardhat 2 and Chai |

# 

# \## 4. Main Features

# 

# \### 4.1 University Administrator Interface

# 

# The administrator interface provides:

# 

# \- Administrator login using an email and password.

# \- MetaMask connection and university contract owner verification.

# \- Student information entry, including name, academic field and graduation year.

# \- PDF diploma import.

# \- SHA-256 fingerprint calculation.

# \- PDF upload to IPFS through the backend.

# \- Diploma issuance through the smart contract.

# \- Diploma history and status management.

# \- Diploma revocation by the authorized university owner.

# \- QR code generation for diploma verification.

# 

# \### 4.2 Public Recruiter Verification Interface

# 

# Recruiters can:

# 

# \- Upload a diploma PDF.

# \- Calculate the SHA-256 fingerprint locally in the browser.

# \- Search for the fingerprint on the Ethereum Sepolia blockchain.

# \- Retrieve the diploma metadata.

# \- Check whether the diploma exists and whether it is valid or revoked.

# 

# Recruiters do not need MetaMask or an administrator account.

# 

# \### 4.3 Smart Contract

# 

# The Solidity contract is named `Diplome`.

# 

# It stores the following information:

# 

# \- PDF fingerprint (`hashPdf`).

# \- Student name (`nomEtudiant`).

# \- Academic field (`filiere`).

# \- Graduation year (`annee`).

# \- IPFS Content Identifier (`cid`).

# \- Issuance timestamp (`dateEmission`).

# \- Validity status (`valide`).

# \- Existence status (`existe`).

# 

# The contract provides three main functions:

# 

# \*\*`emettreDiplome()`\*\*

# 

# Registers a new academic diploma. Only the contract owner can issue diplomas. Duplicate fingerprints and zero hashes are rejected.

# 

# \*\*`verifierDiplome()`\*\*

# 

# Returns the diploma information and its validity status. This function is publicly readable.

# 

# \*\*`revoquerDiplome()`\*\*

# 

# Revokes an existing diploma. Only the contract owner can execute this operation.

# 

# The contract also emits events when diplomas are issued and revoked.

# 

# \## 5. Blockchain Information

# 

# \- Network: Ethereum Sepolia Testnet

# \- Chain ID: `11155111`

# \- Contract name: `Diplome`

# \- Contract address:

# 

# `0xB5E70a6515467F6e95605A34b2Ea66027E1b38d6`

# 

# \- Solidity compiler: `0.8.34`

# 

# Contract explorer:

# 

# \[View VERITAS on Etherscan](https://sepolia.etherscan.io/address/0xB5E70a6515467F6e95605A34b2Ea66027E1b38d6)

# 

# \## 6. Project Architecture

# 

# The system consists of four main components:

# 

# 1\. \*\*React frontend:\*\* Provides the administrator and public recruiter interfaces.

# 2\. \*\*Node.js backend:\*\* Handles administrator authentication and PDF uploads to Pinata.

# 3\. \*\*IPFS storage:\*\* Stores the diploma PDF and returns its CID.

# 4\. \*\*Ethereum smart contract:\*\* Stores diploma fingerprints and academic metadata, and manages issuance, verification and revocation.

# 

# \### Diploma Issuance Process

# 

# 1\. The administrator logs in and connects the university MetaMask wallet.

# 2\. The administrator enters the student's information and selects the diploma PDF.

# 3\. The application calculates the PDF's SHA-256 fingerprint.

# 4\. The backend uploads the PDF to Pinata.

# 5\. Pinata returns the IPFS CID.

# 6\. The administrator confirms diploma issuance through MetaMask.

# 7\. The smart contract records the diploma information on Sepolia.

# 

# \### Diploma Verification Process

# 

# 1\. The recruiter uploads a diploma PDF.

# 2\. The browser calculates its SHA-256 fingerprint locally.

# 3\. The application queries the smart contract.

# 4\. The smart contract returns the diploma information and validity status.

# 5\. The recruiter receives the verification result.

# 

# \## 7. Installation and Local Execution

# 

# \### Requirements

# 

# \- Node.js 20 or later.

# \- npm.

# \- MetaMask browser extension.

# \- An Ethereum Sepolia wallet for administrator operations.

# \- A Pinata account and API JWT for IPFS uploads.

# 

# \### Install Dependencies

# 

# From the project root directory:

# 

# ```bash

# npm install

# ```

# 

# \### Configure Environment Variables

# 

# Create a `.env` file in the project root.

# 

# Configure the following variables:

# 

# ```env

# PORT=3001

# FRONTEND\_URL=http://localhost:5173

# PINATA\_JWT=your\_pinata\_jwt

# ADMIN\_EMAIL=your\_admin\_email

# ADMIN\_PASSWORD\_HASH=your\_bcrypt\_password\_hash

# JWT\_SECRET=your\_private\_random\_jwt\_secret

# ```

# 

# Never commit `.env` or expose private credentials.

# 

# \### Start the Backend

# 

# In the first terminal:

# 

# ```bash

# node backend/server.mjs

# ```

# 

# The backend runs on port 3001 by default.

# 

# \### Start the Frontend

# 

# In a second terminal:

# 

# ```bash

# npm run dev

# ```

# 

# Open:

# 

# `http://localhost:5173/`

# 

# \## 8. Automated Testing

# 

# VERITAS includes Solidity unit tests and integration tests against the deployed Sepolia contract using a local blockchain fork.

# 

# \### Compile the Smart Contract

# 

# ```bash

# npx hardhat compile

# ```

# 

# \### Run Solidity Unit Tests

# 

# ```bash

# npx hardhat test

# ```

# 

# These tests cover ownership, unauthorized access, zero-hash rejection, diploma issuance, metadata storage, duplicate prevention and revocation.

# 

# \*\*Latest recorded result: 11 passing.\*\*

# 

# \### Run Sepolia-Fork Integration Tests

# 

# ```bash

# npx hardhat test --config .\\hardhat.fork.config.cjs .\\integration\\diplome.fork.test.cjs

# ```

# 

# These tests check the behavior of the deployed contract using a temporary local Sepolia fork.

# 

# \*\*Latest recorded result: 7 passing.\*\*

# 

# \### Build the Frontend

# 

# ```bash

# npm run build

# ```

# 

# \## 9. Project Structure

# 

# ```text

# diploma-verification/

# │

# ├── backend/

# │   └── server.mjs

# │

# ├── contracts/

# │   └── Diplome.sol

# │

# ├── integration/

# │   └── diplome.fork.test.cjs

# │

# ├── test/

# │   └── diplome.unit.test.cjs

# │

# ├── src/

# │   ├── components/

# │   ├── pages/

# │   ├── contract.js

# │   ├── App.css

# │   └── index.css

# │

# ├── art/

# ├── public/

# ├── hardhat.config.cjs

# ├── hardhat.fork.config.cjs

# ├── package.json

# └── README.md

# ```

# 

# \## 10. Security and Access Control

# 

# \- The smart contract uses an `onlyOwner` modifier for diploma issuance and revocation.

# \- Zero hashes and duplicate diploma issuance are rejected.

# \- Already revoked diplomas cannot be revoked again.

# \- Recruiter verification is read-only.

# \- Administrator passwords are checked using bcrypt.

# \- Administrator sessions use JSON Web Tokens.

# \- Pinata credentials and JWT secrets are stored in environment variables.

# 

# \## 11. Educational Objectives

# 

# This project demonstrates practical use of:

# 

# \- Cryptographic hashing with SHA-256.

# \- Blockchain-based data integrity.

# \- Solidity smart contract development.

# \- Ownership and access-control mechanisms.

# \- Frontend and blockchain integration with Ethers.js.

# \- MetaMask wallet interaction.

# \- Decentralized storage using IPFS.

# \- Automated smart contract testing with Hardhat and Chai.

# 

# \---

# 

# \*\*Project:\*\* VERITAS — Academic Diploma Certification and Verification

# 

# \*\*Blockchain:\*\* Ethereum Sepolia Testnet

# 

# \*\*Smart Contract:\*\* Diplome

