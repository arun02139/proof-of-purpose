# PRD: Proof of Purpose (PoP) — v1 Prototype

MIT Bitcoin Hackathon 2026 — April 12-13

## Problem Statement

AI companies publish constitutions and safety policies, but there is no trustless way to verify their models actually follow those rules. Users must take the company's word for it. A company could quietly change its promises, ignore its own guidelines, or behave differently when it thinks no one is watching. There is no neutral, permanent, publicly verifiable record of what a company promised or whether it kept those promises.

## Solution

Proof of Purpose (PoP) is a system where AI companies publish machine-readable constitutions — lists of yes/no questions with expected answers — and anchor a cryptographic commitment to Bitcoin. Anyone can then test the model against its own constitution through the normal production API, and any violation is permanently recorded on Bitcoin as proof.

Companies are incentivized to participate because a clean, verified record of constitutional compliance becomes a competitive advantage. A company that refuses to participate — or that accumulates violations — looks untrustworthy by comparison.

For this prototype, we demonstrate the full flow end-to-end: a constitution is published, a model is tested against it with adversarial prompts, results are judged as pass/fail, and the entire bundle is hashed and anchored on Bitcoin. A public dashboard shows trust-level scores broken down by constitutional category.

## User Stories

### Visitor (default dashboard state — click top-right Login to switch to Auditor)

1. As a visitor, I want to see multiple AI providers on the dashboard with their trust scores, so that I can compare them side by side.
2. As a visitor, I want to see trust-level bars for each company broken down by constitutional category (e.g., Safety, Honesty, Bias, Transparency), so that I can quickly assess where a model is strong or weak.
3. As a visitor, I want to see that one provider's results are from real, verified eval data (visually distinct from placeholder data), so that I understand what is live versus coming soon.
4. As a visitor, I want to understand the concept in under 30 seconds from the dashboard landing page, so that I don't need to read a white paper to get the point.
5. As a visitor, I want to see that violations are permanently recorded on Bitcoin and cannot be deleted, so that I trust the system is not controlled by any single party.
6. As a visitor, I want the dashboard to load quickly as a simple web page, so that I can access it without friction.

### Auditor (logged-in dashboard state — click top-right Logout to return to Visitor)

7. As an auditor, I want to see a list of AI companies and their published constitutions, so that I know what each company has committed to.
8. As an auditor, I want to expand a category to see the individual yes/no questions, so that I can inspect what the model is being tested on.
9. As an auditor, I want to click on a specific adversarial question within an expanded category and see input fields for the model's answer and signature, so that I can submit an eval result for that question.
10. As an auditor, I want to submit an answer and signature for a question and have it hashed and anchored on Bitcoin via OpenTimestamps, so that the result is permanently and publicly verifiable.
11. As an auditor, I want to see which questions have already been tested (with pass/fail status and on-chain proof), so that I can identify specific violations and verify prior results.
12. As an auditor, I want to see the SHA-256 hash and a link to verify each anchored result against the Bitcoin blockchain, so that I don't have to trust the dashboard.
13. As an auditor, I want clear instructions on how to independently verify any result (download the bundle, hash it, compare to on-chain record), so that I can confirm results haven't been tampered with.

### AI Company (no dashboard view — participates through constitution publishing and bounty funding)

14. As an AI company, I want to publish my constitution as a structured list of yes/no questions with expected answers, so that auditors have a clear, machine-readable standard to test against.
15. As an AI company, I want my constitution hashed and anchored on Bitcoin, so that the public can verify I haven't quietly changed my promises after the fact.
16. As an AI company, I want to fund bounties on my own model, so that a clean audit record serves as proof that my model follows its stated purpose.
17. As an AI company, I want to see that a bounty pool exists for a given model, so that I understand there is an economic incentive for auditors to test it.
18. As an AI company, I want to see how much has been paid out in bounties for a model, so that I can gauge how actively it is being audited.
19. As an AI company, I want to cryptographically sign my API responses, so that auditors can prove the response genuinely came from my model and wasn't fabricated.
20. As an AI company, I want my compliance score displayed publicly alongside competitors, so that my strong record becomes a market advantage.

### CLI Functions (no dedicated operator role — run optionally to mock or execute work by various parties)

The CLI provides discrete functions that simulate or execute the work of different participants in the protocol. Anyone with the CLI can run these as needed.

21. Run the full eval pipeline against a constitution file, producing a verified eval bundle.
22. Send each hardcoded adversarial prompt to the model API and attach a fake signature to the response, demonstrating the signing requirement.
23. Compare the model's response against the expected Yes/No answer to determine pass/fail.
24. Bundle all inputs, responses, and fake signatures into a single JSON file and write it to a directory the dashboard reads from.
25. Mock the work of other parties (e.g., generate placeholder data for providers not tested live).

## Implementation Decisions

### System Architecture

Two halves decoupled by a JSON file:

- **CLI eval tool** — runs locally, tests a model against a constitution, produces a JSON eval bundle written to a shared data directory
- **Dashboard** — web app that reads the committed JSON, displays trust-level bars, and allows logged-in auditors to submit answer + signature pairs for individual questions and anchor them on Bitcoin via OpenTimestamps

The CLI produces eval data offline. The dashboard is the primary interface for both viewing results and anchoring them on Bitcoin.

### Eval Pipeline

The prototype uses a simplified pipeline with hardcoded inputs and deterministic outputs:

- **Adversarial Prompts** — hardcoded per constitution rule, along with the expected response (Yes or No). Automated prompt generation is future work.
- **Model Under Test** — receives the adversarial prompt via a normal Claude API message call. The response includes a fake cryptographic signature to demonstrate the protocol requirement: in production, foundation model providers must sign each response so that auditors can prove it genuinely came from the model and users cannot spoof fake answers.
- **Pass/Fail Determination** — deterministic string matching against the expected Yes/No answer. No LLM judge is needed because constitution rules are designed to produce binary outcomes.

### Constitution Format

A structured file (YAML) where each entry has a rule ID, a human-readable principle, a category, and a pass/fail criteria. All questions are designed to produce binary outcomes — no subjective interpretation.

Prototype constitution: ~5 rules across 4 categories (Safety, Honesty, Bias, Transparency), derived from Anthropic's published constitution.

### Bitcoin Anchoring

OpenTimestamps for the prototype — anchors the SHA-256 hash of each submitted result to real Bitcoin mainnet. Free, no wallet code, no transaction building required.

Anchoring happens through the dashboard: when a logged-in auditor submits an answer and signature for an adversarial question, the dashboard hashes the submission and creates an OpenTimestamps proof. Each question-level result gets its own anchor, so individual claims are independently verifiable on-chain.

### Dashboard Design

- Trust-level bars per constitutional category for each provider
- Expandable categories showing individual adversarial questions
- Clicking a question (auditor only) reveals input fields for the model's answer and signature, with a submit button that triggers Bitcoin anchoring
- Submitted questions show pass/fail status, the SHA-256 hash, and a link to verify against Bitcoin
- Claude tested live with real eval data; 2-3 other providers shown as placeholders
- Bounty pool shown as a narrated UI concept (not functional)
- Top-right Login/Logout button toggles between Visitor and Auditor state

### What Is Real vs. Narrated

| Component | Status | Notes |
|---|---|---|
| Constitution schema | Real | Structured file with testable rules |
| Adversarial prompts | Hardcoded | Per-rule prompts with expected Yes/No answers; automated generation is future work |
| Model API calls | Real | Testing Claude with real API calls |
| Response signing | Mocked | Fake signature attached to real API responses to demonstrate the concept |
| Pass/fail judging | Real | Deterministic string match against expected answer |
| Bitcoin anchoring | Real | OpenTimestamps via dashboard, real mainnet, per-question anchoring |
| Dashboard with trust bars | Real | Live site reading committed JSON; auditors submit results through the UI |
| API response signing (real) | Narrated | Described as the full-protocol goal; prototype uses fake signatures |
| Bounty pool / payout | Narrated | Shown in UI as a concept |
| Multiple providers tested live | Placeholder | Only Claude is tested; others are hardcoded |

### Key Design Decision: API Response Signing

In the full protocol, the integrity of an audit depends on proving the model actually produced a given response. The solution is that AI companies cryptographically sign their API responses. This is in the company's best interest — unsigned responses are unverifiable, and unverifiable alignment claims are worthless in a world where PoP exists. Signing becomes table stakes.

For the prototype, the eval pipeline attaches a fake signature to each real API response, demonstrating where real signing would occur. This is a known simplification acknowledged in the presentation.

## Testing Decisions

For a 16-hour prototype, the priority is end-to-end validation over unit test coverage.

- **End-to-end test**: Run the CLI to produce an eval bundle, then use the dashboard to submit an answer + signature for a question and verify it produces a valid OpenTimestamps proof. This is the critical path.
- **Eval Engine**: Most worth unit testing if time permits — mock the API calls and verify the pipeline produces correctly structured output with fake signatures and deterministic pass/fail. Good tests verify the external behavior (given this constitution input, the output bundle has the right shape and fields) rather than internal implementation details.
- **Dashboard**: Visual verification in browser. No automated UI tests.
- **Constitution Parser / Bundle & Stamp**: Thin wrappers, not worth dedicated tests under time pressure.

## Out of Scope

- **ZK proofs** — future work for proving eval integrity without revealing which questions were tested
- **Real bounty escrow / payout** — requires Bitcoin Script work beyond prototype scope; narrated in UI
- **Real API response signing** — requires company cooperation; prototype uses fake signatures to demonstrate the concept
- **Live eval triggered from the website** — model API calls run offline via CLI; the dashboard handles only answer/signature submission and Bitcoin anchoring
- **Multiple providers tested live** — only Claude is tested with real API calls
- **Constitution authoring UI** — constitutions are hand-written structured files
- **Historical eval tracking / trend lines** — dashboard shows latest run only
- **Auditor registration or identity** — the full protocol is permissionless; prototype uses a simple login toggle on the dashboard

## Further Notes

- A proof-of-concept eval bundle has already been hashed and submitted to Bitcoin mainnet via OpenTimestamps. This validates that the anchoring approach works end-to-end.
- The presentation should walk through the full PoP flow (company publishes → auditor tests → violation anchored → bounty pays) even though only parts are built live. The dashboard and Bitcoin proof are the "show, don't tell" moments.
- The PoP.md document in the repo root contains the full protocol vision, open research questions, and a diagram reproduction spec. This PRD scopes only what is built for the hackathon.
- Companies as bounty providers is a core narrative point: "We're so confident in our model that we'll pay you to try to break it." This framing should be prominent in the dashboard and presentation.
