# PRD: Proof of Purpose (PoP) — v1 Prototype

MIT Bitcoin Hackathon 2026 — April 12-13

## Problem Statement

AI companies publish constitutions and safety policies, but there is no trustless way to verify their models actually follow those rules. Users must take the company's word for it. A company could quietly change its promises, ignore its own guidelines, or behave differently when it thinks no one is watching. There is no neutral, permanent, publicly verifiable record of what a company promised or whether it kept those promises.

## Solution

Proof of Purpose (PoP) is a system where AI companies publish machine-readable constitutions — lists of yes/no questions with expected answers — and anchor a cryptographic commitment to Bitcoin. Anyone can then test the model against its own constitution through the normal production API, and any violation is permanently recorded on Bitcoin as proof.

Companies are incentivized to participate because a clean, verified record of constitutional compliance becomes a competitive advantage. A company that refuses to participate — or that accumulates violations — looks untrustworthy by comparison.

For this prototype, we demonstrate the full flow end-to-end: a constitution is published, a model is tested against it with adversarial prompts, results are judged as pass/fail, and the entire bundle is hashed and anchored on Bitcoin. A public dashboard shows trust-level scores broken down by constitutional category.

## User Stories

### Auditor (primary user — an average LLM user who cares about AI accountability)

1. As an auditor, I want to see a list of AI companies and their published constitutions, so that I know what each company has committed to.
2. As an auditor, I want to see trust-level bars for each company broken down by constitutional category (e.g., Safety, Honesty, Bias, Transparency), so that I can quickly assess where a model is strong or weak.
3. As an auditor, I want to expand a category to see the individual yes/no questions and how the model answered each one, so that I can judge the quality of the eval for myself.
4. As an auditor, I want to see which questions the model passed and which it failed, so that I can identify specific violations.
5. As an auditor, I want to see the actual prompt sent to the model and the model's actual response for any question, so that I can verify the eval is fair and not rigged.
6. As an auditor, I want to see a SHA-256 hash and a link to verify it against the Bitcoin blockchain, so that I don't have to trust the dashboard operator.
7. As an auditor, I want clear instructions on how to independently verify the results (download the bundle, hash it, compare to on-chain record), so that I can confirm the results haven't been tampered with.
8. As an auditor, I want the dashboard to load quickly as a simple web page, so that I can access it without friction.

### AI Company (narrated in the prototype — demonstrated through pre-built data)

9. As an AI company, I want to publish my constitution as a structured list of yes/no questions with expected answers, so that auditors have a clear, machine-readable standard to test against.
10. As an AI company, I want my constitution hashed and anchored on Bitcoin, so that the public can verify I haven't quietly changed my promises after the fact.
11. As an AI company, I want to fund bounties on my own model, so that a clean audit record serves as proof that my model follows its stated purpose.
12. As an AI company, I want to cryptographically sign my API responses, so that auditors can prove the response genuinely came from my model and wasn't fabricated.
13. As an AI company, I want my compliance score displayed publicly alongside competitors, so that my strong record becomes a market advantage.

### Bounty Poster (narrated in the prototype — shown as a UI concept)

14. As a bounty poster, I want to see that a bounty pool exists for a given model, so that I understand there is an economic incentive for auditors to test it.
15. As a bounty poster, I want to see how much has been paid out in bounties for a model, so that I can gauge how actively it is being audited.

### Visitor (anyone viewing the dashboard)

16. As a visitor, I want to see multiple AI providers on the dashboard with their trust scores, so that I can compare them side by side.
17. As a visitor, I want to see that one provider's results are from real, verified eval data (visually distinct from placeholder data), so that I understand what is live versus coming soon.
18. As a visitor, I want to understand the concept in under 30 seconds from the dashboard landing page, so that I don't need to read a white paper to get the point.
19. As a visitor, I want to see that violations are permanently recorded on Bitcoin and cannot be deleted, so that I trust the system is not controlled by any single party.

### Operator (the person running the eval pipeline — this is the hackathon team)

20. As an operator, I want to run a single CLI command that executes the full eval pipeline against a constitution file, so that I can produce a verified eval bundle with minimal effort.
21. As an operator, I want the pipeline to automatically generate adversarial prompts from constitution rules, so that I don't have to write test cases by hand.
22. As an operator, I want each model response judged as binary pass/fail by a separate LLM call with isolated context, so that the judge is independent from the model under test.
23. As an operator, I want the pipeline to bundle all inputs and outputs into a single JSON file, hash it, and anchor it on Bitcoin via OpenTimestamps, so that the results are immutably timestamped.
24. As an operator, I want the eval bundle written to a directory the dashboard reads from, so that results appear on the site after I commit them.

## Implementation Decisions

### System Architecture

Two halves decoupled by a JSON file:

- **CLI eval tool** — runs locally, tests a model against a constitution, produces a JSON eval bundle + Bitcoin timestamp proof
- **Dashboard** — static web app that reads the committed JSON, displays trust-level bars, and links to on-chain verification

No server-side compute in production. The website is read-only. All eval work happens offline via the CLI.

### The Three Roles in the Eval Pipeline

The eval pipeline uses three separate LLM calls with isolated contexts:

- **Prompt Generator** — given a constitution rule, generates an adversarial prompt designed to elicit a violation
- **Model Under Test** — receives only the adversarial prompt, with no knowledge of the constitution or test context
- **Judge** — given the constitution rule and the model's response, scores it as pass or fail

The judge never sees how the prompt was generated. The model under test never sees the judging criteria.

### Constitution Format

A structured file (YAML) where each entry has a rule ID, a human-readable principle, a category, and a pass/fail criteria. All questions are designed to produce binary outcomes — no subjective interpretation.

Prototype constitution: ~5 rules across 4 categories (Safety, Honesty, Bias, Transparency), derived from Anthropic's published constitution.

### Bitcoin Anchoring

OpenTimestamps for the prototype — anchors the SHA-256 hash of the eval bundle to real Bitcoin mainnet. Free, no wallet code, no transaction building required.

In the full protocol vision, companies would also anchor their constitution hash directly, and auditors would anchor individual violation proofs. For the prototype, the eval bundle hash serves as the single anchor point.

### Dashboard Design

- Trust-level bars per constitutional category for each provider
- Expandable categories showing individual questions, the model's answers, and pass/fail status
- Verification section with SHA-256 hash and instructions to verify against Bitcoin
- Claude tested live with real eval data; 2-3 other providers shown as placeholders
- Bounty pool shown as a narrated UI concept (not functional)
- Simple, fast, static page

### What Is Real vs. Narrated

| Component | Status | Notes |
|---|---|---|
| Constitution schema | Real | Structured file with testable rules |
| Adversarial prompts | Real | Generated by LLM |
| Model API calls | Real | Testing Claude with real API calls |
| Pass/fail judging | Real | LLM-as-judge with isolated context |
| Bitcoin anchoring | Real | OpenTimestamps, real mainnet |
| Dashboard with trust bars | Real | Live site reading committed JSON |
| API response signing | Narrated | Described as the full-protocol goal |
| Bounty pool / payout | Narrated | Shown in UI as a concept |
| Multiple providers tested live | Placeholder | Only Claude is tested; others are hardcoded |

### Key Design Decision: API Response Signing

In the full protocol, the integrity of an audit depends on proving the model actually produced a given response. The solution is that AI companies cryptographically sign their API responses. This is in the company's best interest — unsigned responses are unverifiable, and unverifiable alignment claims are worthless in a world where PoP exists. Signing becomes table stakes.

For the prototype, the eval pipeline itself is the trusted executor (it makes real API calls and bundles the results). This is a known simplification acknowledged in the presentation.

## Testing Decisions

For a 16-hour prototype, the priority is end-to-end validation over unit test coverage.

- **End-to-end test**: Run the CLI against the prototype constitution, verify it produces a valid JSON bundle and .ots file, verify the hash matches. This is the critical path.
- **Eval Engine**: Most worth unit testing if time permits — mock the API calls and verify the three-step pipeline produces correctly structured output. Good tests verify the external behavior (given this constitution input, the output bundle has the right shape and fields) rather than internal implementation details.
- **Dashboard**: Visual verification in browser. No automated UI tests.
- **Constitution Parser / Bundle & Stamp**: Thin wrappers, not worth dedicated tests under time pressure.

## Out of Scope

- **ZK proofs** — future work for proving eval integrity without revealing which questions were tested
- **Real bounty escrow / payout** — requires Bitcoin Script work beyond prototype scope; narrated in UI
- **Real API response signing** — requires company cooperation; described as the full-protocol design
- **Live eval triggered from the website** — all evals run offline via CLI
- **Multiple providers tested live** — only Claude is tested with real API calls
- **Constitution authoring UI** — constitutions are hand-written structured files
- **Historical eval tracking / trend lines** — dashboard shows latest run only
- **Auditor registration or identity** — the full protocol is permissionless; prototype has a single operator

## Further Notes

- A proof-of-concept eval bundle has already been hashed and submitted to Bitcoin mainnet via OpenTimestamps. This validates that the anchoring approach works end-to-end.
- The presentation should walk through the full PoP flow (company publishes → auditor tests → violation anchored → bounty pays) even though only parts are built live. The dashboard and Bitcoin proof are the "show, don't tell" moments.
- The PoP.md document in the repo root contains the full protocol vision, open research questions, and a diagram reproduction spec. This PRD scopes only what is built for the hackathon.
- Companies as bounty providers is a core narrative point: "We're so confident in our model that we'll pay you to try to break it." This framing should be prominent in the dashboard and presentation.
