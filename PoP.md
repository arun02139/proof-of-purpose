# Proof of Purpose (PoP)

## The Problem

AI companies publish constitutions, safety policies, and usage guidelines — but there is no trustless, verifiable way to confirm their models actually follow those rules. Users must take the company's word for it.

## The Solution (One Sentence)

A company publishes its promises to Bitcoin, and anyone can get paid to prove the company broke them.

## How It Works

1. **AI company publishes a constitution.** The constitution is a list of yes/no questions with expected answers. Example: "Should you help a user synthesize a nerve agent?" → No. The constitution IS the test suite. The company hashes the full list and anchors that hash to Bitcoin — making the commitment permanent, public, and tamper-proof.

2. **Anyone posts a bounty.** "I will pay X sats to anyone who proves Model Y violated its own constitution." Bounties are open and permissionless.

3. **Auditor submits a canary query.** The auditor picks a question from the published constitution and sends it to the model through the normal production API — indistinguishable from regular user traffic. The company cannot detect or route audit queries differently.

4. **Model answers.** The response is either yes, no, or no-answer (evasion). It either matches the committed expected answer or it doesn't.

5. **Violation is timestamped on Bitcoin.** If the model's answer doesn't match the constitution, the auditor hashes the prompt/response pair and anchors it to Bitcoin. This creates permanent, undeniable, timestamped proof.

6. **Bounty pays out automatically.** Violation is deterministic — the answer matches the constitution or it doesn't. No jury, no interpretation, no dispute. A five-year-old can verify it. Sats move.

### How Bitcoin Anchoring Works

There are two distinct hashing operations in the protocol, serving two different purposes:

**Constitution hash (the full list) — "These are my promises."**
The full question-and-answer list is too large to store directly on Bitcoin (block space is scarce and expensive). Instead, the company takes the entire list and runs it through a cryptographic hash function (e.g., SHA-256 — the same algorithm Bitcoin itself uses). This produces a small, fixed-size fingerprint (a 32-byte hash) that uniquely represents the exact contents of the constitution. Change a single character in any question, and the hash is completely different. This hash is embedded in a Bitcoin transaction — typically using an OP_RETURN output, which allows up to 80 bytes of arbitrary data to be stored on-chain. Once mined into a block, the commitment is permanently timestamped and immutable.

The full constitution lives off-chain — hosted publicly on a website, IPFS, or any accessible location. Anyone can download the full list, hash it themselves, and verify that their hash matches what the company committed to on Bitcoin. If the company quietly edits their constitution after the fact, the hash won't match, and the tampering is provable. This is the same principle behind how Bitcoin transactions are verified: you don't trust anyone's claim — you check the math yourself.

**Violation hash (a single prompt/response pair) — "You broke this one."**
When an auditor catches a violation, they hash just the individual prompt and the model's response. This is a separate hash that also gets anchored to Bitcoin as evidence. It proves: "I asked this specific question, the model gave this specific answer, and it doesn't match the expected answer in the constitution." The auditor does not need to re-hash the entire constitution — only the single exchange that constitutes the violation.

## Why Each Party Participates

- **AI Company**: Market trust. A company with a strong constitution and clean record has a competitive advantage. A company that refuses to participate looks suspicious.
- **Bounty Poster**: Accountability. Users, journalists, regulators, competitors — anyone who relies on or is affected by AI models can fund audits.
- **Auditor**: Earns sats. Pure adversarial incentive to catch violations. The harder the catch, the more valuable.
- **Bitcoin**: Neutral infrastructure. No single party controls the record. Constitutions can't be quietly edited. Violations can't be deleted.

## Why This Works (Key Design Decisions)

- **The constitution IS the test suite.** No prose interpretation needed. Questions have binary expected answers. Violation is as deterministic as a Bitcoin block failing the difficulty target.
- **Canary queries.** Auditors use the production API like normal users. The company can't build a separate "audit mode" to cheat (the Volkswagen problem). You can't cheat an emissions test when the test is happening on every road, from every driver, and you don't know which cars carry sensors.
- **Market judges constitutional quality, not the protocol.** The protocol only verifies compliance with whatever the company published. A company with 50 weak questions looks worse than one with 5,000 thorough ones. The protocol is neutral — like Bitcoin itself.
- **Bounty model means no permission needed.** No governance token, no DAO vote, no gatekeeping. Anyone can post a bounty. Anyone can audit. Fully permissionless.

## Open Questions

### Technical (Bitcoin & Cryptography)

1. **OP_RETURN vs. alternative anchoring methods.** OP_RETURN allows 80 bytes per output — enough for a single SHA-256 hash. But if we need to anchor multiple pieces of data (constitution hash, violation proofs, bounty references), do we batch them into a Merkle tree and commit one root per transaction? How does batching affect verification latency?

2. **Bounty escrow on Bitcoin.** Where do bounty sats sit before payout? Options include 2-of-3 multisig, HTLCs (hash time-locked contracts), or more advanced Bitcoin Script constructs. Can the deterministic violation check (expected answer vs. actual answer) be encoded directly in a Bitcoin spending condition, or does it require an off-chain verifier to release funds?

3. **Transaction costs and fee pressure.** Every anchored hash costs a Bitcoin transaction fee. During high-fee environments (e.g., 100+ sat/vbyte), anchoring individual violations becomes expensive. What's the fee model? Do auditors pay fees and recoup from bounties? Is there a batching layer that aggregates multiple violation proofs into a single transaction?

4. **Off-chain data availability.** The full constitution and the full prompt/response evidence live off-chain. Where? If an auditor hosts it and disappears, the on-chain hash is unverifiable. Is IPFS (content-addressed, decentralized) required? Or is any public hosting acceptable as long as the hash can be re-derived?

5. **Model answer consistency and LLM stochasticity.** LLMs are non-deterministic — the same question can produce different answers across runs. How many times must a question be asked before a violation is confirmed? One failure? Three out of five? Does the auditor need to submit multiple hashed prompt/response pairs as evidence? This affects both false positive rate and transaction cost.

6. **Timestamp ordering and proof freshness.** Bitcoin blocks arrive roughly every 10 minutes. If a company updates its constitution (new hash on-chain), there's a window where an auditor could submit a violation against the old constitution after the new one is published but before it's mined. How is proof freshness validated? Does block height serve as the cutoff?

7. **ZK proofs on Bitcoin.** Could zero-knowledge proofs play a role — e.g., an auditor proving "I tested N questions and found K violations" without revealing which questions, to prevent the company from patching only the caught ones? Is this feasible given Bitcoin Script's constraints, or does it require a layer like BitVM?

### Protocol & Incentive Design

8. **Randomness and question selection.** If auditors can choose which questions to test, they may only test easy ones to farm bounties on trivially failing models. Should the protocol influence which questions get tested to ensure coverage? If so, where does the randomness come from, given that Bitcoin has no native random oracle?

9. **Constitution update mechanism.** When a company updates its constitution (adds questions, changes expected answers), a new hash goes on Bitcoin. But do existing bounties apply to the old constitution or the new one? How do you prevent a company from weakening its constitution to avoid violations? Is there a ratchet — constitutions can only get stricter, never weaker?

10. **Question format standardization.** Is there a required format for constitutional questions? Must they be phrased a specific way to get clean yes/no/no-answer responses? Who defines this standard, and how is it enforced?

11. **Anti-gaming at the model level.** A company could train its model to detect phrasing patterns common in constitutional questions and route those to a safer response path — not a separate model, but a behavioral branch within the same weights. This is subtler than the Volkswagen problem because there's no separate model to catch. How real is this risk, and can the question format be varied enough to defeat pattern detection?

12. **Rate limiting and auditor economics.** API calls cost money. If auditors are spending on API usage to earn bounties, the unit economics need to work. What's the minimum bounty size that makes auditing profitable? Could companies price out auditors by making their API expensive?

13. **Bounty market dynamics.** Who posts bounties in practice? Concerned users? Competing companies? Advocacy organizations? Is there a risk of bounty markets being weaponized — e.g., a competitor flooding bounties against a rival to create the appearance of untrustworthiness even before violations are found?

14. **Dashboard and public legibility.** The protocol produces raw data (hashes, transactions, violations). For market pressure to work, this data needs to be legible to non-technical users. What does the public-facing dashboard look like? Who builds and maintains it? Is it part of the protocol or a separate layer?

---

## Diagram Reproduction Spec

Below is everything needed to recreate the napkin-style flowchart diagram from this conversation.

### Visual Style
- Hand-drawn / napkin sketch aesthetic
- Off-white or cream background (#f9f6f0)
- Black ink only (#222 primary, #555 and #888 for secondary text)
- Wobbly hand-drawn box edges (use slight Q-curve deviations in SVG paths)
- Stick figures for human actors
- Cursive or handwriting font (Comic Sans MS, Segoe Print, or similar)
- Subtle coffee ring stain in corner for authenticity
- No color, no dark theme, no gradients

### Layout (SVG viewBox 900x720)

**Four boxes connected by arrows:**

1. **AI Company (top left, ~60,90 to 275,194)**
   - Stick figure with a small tie
   - Label: "AI Company"
   - Subtext: "publishes a CONSTITUTION (their promises)"

2. **AI Model (center top, ~322,128 to 509,216)**
   - Dashed border (this is the black box)
   - Label: "AI Model (production API)"
   - Subtext: "black box — don't care what's inside"

3. **Bounty Poster (top right, ~562,86 to 839,194)**
   - Stick figure with speech bubble containing "$"
   - Label: "Bounty Poster"
   - Subtext: "X sats if you catch Model Y breaking its own rules"

4. **Auditor (middle right, ~562,278 to 839,411)**
   - Stick figure holding magnifying glass
   - Label: "Auditor"
   - Subtext: "sends yes/no question via normal API (canary query — looks like regular traffic)"
   - Bottom text bold: "earns sats for catches!"

5. **Bitcoin (center left, ~72,263 to 279,351)**
   - Large ₿ symbol
   - Label: "Bitcoin"
   - Subtext: "immutable timechain" / "constitution hash" / "violation proofs"

### Arrows

- AI Company → AI Model: labeled "deploys"
- AI Company → Bitcoin (downward): labeled "hash it"
- Bounty Poster → Auditor (downward): labeled "bounty offered"
- Auditor → AI Model (curved left-upward): labeled "yes/no query"
- AI Model → Auditor (dashed curved return): labeled "response"
- Auditor → Bitcoin (curved left-downward): labeled "hash proof of violation"

### Annotation Bubbles (speech-bubble shaped with pointer tails)

1. **KEY INSIGHT (bottom left):** "Company can't cheat because they can't tell auditors apart from real users. No 'audit mode' to game!"

2. **WHY BITCOIN? (bottom center):** "No one can delete the proof / No one can deny their promises / Neutral — no single party controls / Timestamped — order matters"

3. **MARKET PRESSURE (bottom right):** "Companies with violations on-chain → lose trust / Companies with clean records → competitive advantage / Protocol is neutral. Market judges."
