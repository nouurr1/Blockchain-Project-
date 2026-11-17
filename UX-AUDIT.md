# VERITAS UX review: before and after

Method: automated axe-core scan (WCAG 2.0/2.1/2.2 A and AA plus best practices) on 14 page states,
keyboard checks on dialogs and tabs, heuristic walk-through of the three key journeys,
and a copy review. Tested against a mocked blockchain module, not a live wallet.

## Strategy
- **Audiences:** employers and recruiters (verify), university admins (issue, revoke).
- **Product outcome:** more completed verifications, and more diplomas that carry a shareable proof link.
- **Core idea:** every diploma has a unique, visible fingerprint, generated from its real SHA-256 hash.
  The fingerprint turns an invisible cryptographic check into something people can see, play with and trust.

## Findings in v1 and what changed
| # | Finding | Severity | Fix |
|---|---|---|---|
| 1 | "Valid" badge: white on green, 2.67:1 (needs 4.5:1) | Serious | Tinted badge with light-green text |
| 2 | Verify dropzone accessible name did not match visible text | Serious | Native label wrapping the file input |
| 3 | Admin page had no `main` landmark, unnamed sidebar | Moderate | `main#main`, named landmarks, skip link |
| 4 | Mascot caption used an invalid ARIA role | Minor | `role="status"` moved to an inner element (mascot visuals untouched) |
| 5 | Dialogs: no focus trap, no focus return | Major | `useDialog` hook: focus in, Tab trap, Esc closes, focus restored |
| 6 | Home page had nothing to interact with except links | Major | Hero drop zone, tamper test, tabbed explainer, FAQ |
| 7 | Verifying took two steps (choose, then press Verify) | Moderate | Auto-verify on drop; drop on the home page hands off to the scanner |
| 8 | A result was a dead end | Major | Proof chain, "Copy proof link", share link opens the record without the file |
| 9 | Revoke was blind (name shown only after signing) | Major | Record preview (name, degree, status) before confirm; button disabled unless valid |
| 10 | Issue gave no progress and no payoff | Moderate | Live fingerprint preview, 4-step progress, success card with share actions |
| 11 | Blue-on-white contrast (4.1:1 and 4.2:1) | Serious | `--blue-strong` for text-bearing blues |
| 12 | QR code had no text alternative | Serious | `aria-label` |

Result: **8 violation types in v1, 0 in v2** across 14 states. Automated tools catch roughly a third of issues,
so a screen-reader pass (VoiceOver or NVDA) is still recommended.

## Accent system
Palette unchanged (navy, blue to cyan, fox orange). Roles are now explicit:
- **Orange** = the action to take (primary buttons, drop-zone hover). Dark text on orange.
- **Cyan / blue** = chain data (fingerprints, links, structure).
- **Green / amber / red** = verdicts only.

## Copy changes (UX writing)
Page titles and nav in title case, buttons and descriptions in sentence case, verb-first buttons,
one terminology set ("fingerprint", "record", "proof link"), errors that say what happened and what to do.

## Still open
- Not tested on a live wallet, Sepolia or IPFS.
- Four React-compiler lint warnings (setState in effects) remain; they do not affect behaviour.
- Consider real user testing of the first-visit flow with 5 employers.

## Art direction pass (round 3)
- **Backdrops:** two rendered images (a synthesised fingerprint lit like a macro photo) replace the CSS gradients. Source: `art/render.py`.
- **Type:** Bricolage Grotesque (headlines, condensed optical width) + IBM Plex Sans (body) + IBM Plex Mono (hashes). Replaces Plus Jakarta Sans.
- **Surfaces:** flat panels with hairline borders instead of frosted glass; outlined icons instead of gradient tiles; flat orange buttons with no glow; film grain.
- **Contrast over images:** axe cannot measure text over images, so contrast was measured on rendered pixels
  (brightest 1% behind each text block). Worst case after tuning: 6.0:1 desktop, 8.1:1 mobile. Before tuning: 1.2:1 and 2.6:1 on two hero lines.
