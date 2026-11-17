# Deploying VERITAS

The smart contract is already live on Sepolia (`0xB5E70a6515467F6e95605A34b2Ea66027E1b38d6`), so only the
**backend** (IPFS upload proxy) and the **frontend** need hosting. Suggested setup: GitHub + Render + Vercel.
Both have free tiers.

Order matters: backend first (its URL is needed by the frontend), then the frontend (its URL is needed by the backend's CORS setting).

## 0. Before anything: secure your keys
1. Sign in to Pinata, **delete the old API key** and create a new one with "Files: write" only. Copy the JWT.
2. Make sure `.env` was never pushed to GitHub. If it was, treat the old key as leaked (step 1 covers it) and
   remove the file from the repo history.

## 1. Push to GitHub
Repo root is the folder that contains `diploma-verification/`. Confirm `.gitignore` lists `.env` and `node_modules`.

## 2. Deploy the backend on Render
1. render.com → New → **Web Service** → connect the repo.
2. Settings:
   - Root Directory: `diploma-verification`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`
3. Environment variables:
   - `PINATA_JWT` = the new JWT
   - `OWNER_ADDRESS` = `0x43bcC06290B3591f5c131D9badDeae832cD4dAF2`
   - `FRONTEND_ORIGIN` = `http://localhost:5173` for now (you'll change it in step 4)
4. Deploy, then open `https://<your-service>.onrender.com/health`. You should see `{"ok":true}`.
   Note the URL.

Free-tier note: Render sleeps idle services, so the first upload after a pause can take about 50 seconds.
Verifying diplomas does not use the backend, so employers are not affected.

## 3. Deploy the frontend on Vercel
1. vercel.com → Add New → Project → import the same repo.
2. Settings:
   - Root Directory: `diploma-verification`
   - Framework: Vite (auto-detected). Build `npm run build`, output `dist`.
3. Environment variable: `VITE_API_URL` = your Render URL (no trailing slash).
4. Deploy. `vercel.json` already makes links like `/verify?hash=…` work. Note your Vercel URL.

## 4. Connect the two
In Render, set `FRONTEND_ORIGIN` to your Vercel URL (add a custom domain too, comma-separated, if you have one)
and let the service redeploy.

## 5. Test it (about 10 minutes)
- [ ] Home page loads; dropping a PDF on the hero goes to the scanner.
- [ ] Open `/verify` directly in a new tab (no 404).
- [ ] Verify a diploma you issued earlier: result is Valid.
- [ ] Open its "Copy proof link" URL in a private window: the record loads.
- [ ] `/admin`: connect MetaMask (Sepolia, owner account). Overview and Registry load.
- [ ] Issue a test diploma: MetaMask asks for a **signature** (free), then the **transaction** (needs Sepolia ETH).
- [ ] Try issuing from a different account: it must be refused.
- [ ] Revoke the test diploma and re-verify: result is Revoked.

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| "Failed to fetch" when issuing | `VITE_API_URL` wrong, or `FRONTEND_ORIGIN` doesn't exactly match your site URL |
| "Only the contract owner can upload" | Connected with a different wallet than `OWNER_ADDRESS` |
| "The signature expired" | Computer clock is off by more than 5 minutes |
| "Too many uploads" | More than 20 upload attempts in 15 minutes |
| Registry fails to load | Public RPC rate limit. Retry, or use your own Alchemy/Infura Sepolia URL in `src/contract.js` |
| 404 on refresh of `/verify` | Rewrite not applied: confirm `vercel.json` is in the project root |
