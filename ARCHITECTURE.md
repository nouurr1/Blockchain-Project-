\# VERITAS — System Architecture



\## 1. Architecture Overview



VERITAS uses a React frontend, an Express backend, IPFS decentralized storage and an Ethereum smart contract deployed on the Sepolia test network.



\## 2. Architecture Diagram



```mermaid

flowchart TB

&#x20;   Admin\["University Administrator"]

&#x20;   Recruiter\["Public Recruiter"]



&#x20;   Frontend\["React Frontend<br/>Vite + Ethers.js"]

&#x20;   Backend\["Node.js / Express Backend<br/>JWT Authentication"]

&#x20;   Pinata\["Pinata / IPFS Storage"]

&#x20;   Wallet\["MetaMask"]

&#x20;   Contract\["Diplome Smart Contract<br/>Ethereum Sepolia"]

&#x20;   RPC\["Sepolia Public RPC"]



&#x20;   Admin -->|"Email and password"| Frontend

&#x20;   Frontend -->|"POST /api/admin/login"| Backend

&#x20;   Backend -->|"JWT token"| Frontend



&#x20;   Admin -->|"Connect university wallet"| Wallet

&#x20;   Wallet -->|"Owner verification"| Contract



&#x20;   Admin -->|"Select diploma PDF"| Frontend

&#x20;   Frontend -->|"PDF upload with JWT"| Backend

&#x20;   Backend -->|"Upload PDF"| Pinata

&#x20;   Pinata -->|"Return CID"| Backend

&#x20;   Backend -->|"CID response"| Frontend



&#x20;   Frontend -->|"Calculate SHA-256 locally"| Frontend

&#x20;   Frontend -->|"Issue diploma: hash + metadata + CID"| Wallet

&#x20;   Wallet -->|"Signed blockchain transaction"| Contract



&#x20;   Recruiter -->|"Upload diploma PDF"| Frontend

&#x20;   Frontend -->|"Calculate SHA-256 locally"| Frontend

&#x20;   Frontend -->|"Read-only verification request"| RPC

&#x20;   RPC -->|"Call verifierDiplome(hash)"| Contract

&#x20;   Contract -->|"Diploma metadata and validity"| RPC

&#x20;   RPC -->|"Verification result"| Frontend

&#x20;   Frontend -->|"Authenticity result"| Recruiter

```



\## 3. Administrator Workflow



1\. The administrator signs in using an email and password.

2\. The backend validates the credentials and returns a JWT session token.

3\. The administrator connects MetaMask.

4\. The frontend checks that the connected account matches the smart contract owner.

5\. The administrator enters the student's information and selects a diploma PDF.

6\. The frontend calculates the SHA-256 fingerprint.

7\. The backend uploads the PDF to Pinata.

8\. Pinata returns the CID.

9\. The administrator confirms the issuance transaction using MetaMask.

10\. The smart contract stores the diploma fingerprint and academic metadata.



\## 4. Recruiter Workflow



1\. The recruiter opens the public verification interface.

2\. The recruiter selects a diploma PDF.

3\. The browser calculates its SHA-256 fingerprint locally.

4\. The frontend calls the public `verifierDiplome()` function.

5\. The smart contract returns the diploma information.

6\. The frontend displays whether the diploma exists and whether it is valid or revoked.



The recruiter does not need an administrator account or MetaMask wallet.



\## 5. Main Components



| Component | Responsibility |

|---|---|

| React frontend | Administrator and recruiter interfaces |

| Express backend | Administrator authentication and PDF upload processing |

| MetaMask | Signs university blockchain transactions |

| Pinata / IPFS | Stores diploma PDF files |

| Diplome smart contract | Registers, verifies and revokes diplomas |

| Sepolia RPC | Provides public blockchain read access |



\## 6. Blockchain Data



The smart contract stores:



\- PDF fingerprint (`hashPdf`)

\- Student name (`nomEtudiant`)

\- Academic field (`filiere`)

\- Graduation year (`annee`)

\- IPFS CID (`cid`)

\- Issuance date (`dateEmission`)

\- Validity status (`valide`)

\- Existence status (`existe`)



\*\*Network:\*\* Ethereum Sepolia Testnet



\*\*Contract:\*\* `0xB5E70a6515467F6e95605A34b2Ea66027E1b38d6`



\---



\*\*Project:\*\* VERITAS — Academic Diploma Certification and Verification

