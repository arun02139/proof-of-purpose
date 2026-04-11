# PRD: Proof-of-Alignment Hackathon Prototype

MIT Bitcoin Hackathon 2026 — April 12-13 (2-day build)

## Problem Statement

Every person will soon have an AI advisor managing their finances, health, career, and political understanding. The company that runs your AI can subtly tweak a dial of influence — argue for a candidate, nudge purchases, shape beliefs. Foreign intelligence operatives have already been caught inside major AI labs, where a single insider can poison training data or plant a backdoor.

AI companies publish constitutions and safety policies, but there is no way to verify they actually follow them. "Trust us" is the current standard of evidence. Publishing a constitution is not enough — the world needs Proof-of-Alignment.

## Solution

A system that takes a machine-readable AI constitution, automatically tests a model against its stated rules using adversarial prompts, bundles the full results (constitution + prompts + raw responses + scores) into a JSON file, and anchors the SHA-256 hash of that bundle on Bitcoin via OpenTimestamps — creating an immutable, publicly verifiable record that the eval happened and the results have not been tampered with.

A public dashboard displays the results and allows anyone to independently verify them by downloading the bundle, hashing it, and comparing against the on-chain record.

The core claim: "Here are eval results, and here is cryptographic proof — timestamped on Bitcoin — that these results existed at this moment and have not been altered since."

## User Stories

1. As an operator, I want to run a single CLI command that executes the full eval pipeline against a constitution file, so that I can produce a verified eval bundle with minimal effort.
2. As an operator, I want the eval pipeline to generate adversarial prompts automatically from constitution rules, so that I don't have to write test cases by hand.
3. As an operator, I want the eval pipeline to call the model under test with each adversarial prompt in a clean, isolated context, so that results are not contaminated by prior prompts.
4. As an operator, I want each response judged as binary pass/fail by a separate LLM call with its own context, so that the judge is independent from the prompt generator and the model under test.
5. As an operator, I want the pipeline to bundle all inputs and outputs (constitution, prompts, responses, scores, reasoning) into a single JSON file, so that the full eval is reproducible and auditable.
6. As an operator, I want the pipeline to SHA-256 hash the bundle and anchor it on Bitcoin via OpenTimestamps, so that the results are immutably timestamped without requiring wallet code or transaction fees.
7. As an operator, I want the eval bundle and .ots proof file written to a `data/results/` directory, so that I can commit them to the repo and the dashboard picks them up automatically.
8. As a visitor, I want to see a dashboard at a public URL showing provider compliance scores, so that I can quickly assess which AI models are verified as aligned.
9. As a visitor, I want to see sub-category scores (Safety, Honesty, Bias, Transparency) for each provider, so that I can understand where a model is strong or weak.
10. As a visitor, I want to see the actual eval results — which rules were tested, what the model responded, and whether it passed or failed — so that I can judge the quality of the eval for myself.
11. As a visitor, I want to see a verification section showing the SHA-256 hash and instructions to verify against the Bitcoin blockchain, so that I don't have to trust the dashboard operator.
12. As a visitor, I want to see multiple provider cards on the dashboard (even if most are placeholder data), so that I can understand the vision of a global alignment index.
13. As a visitor, I want the Claude provider card to show real, verified eval data that is visually distinct from placeholder cards, so that I can tell what is real and what is coming soon.
14. As an operator, I want the constitution defined in a YAML file with structured fields (id, principle, category, pass_criteria), so that the eval pipeline can parse and process it programmatically.
15. As an operator, I want the CLI to read the constitution path as a command-line argument, so that I can test different constitutions without modifying code.
16. As a visitor, I want the dashboard to load quickly as a static site, so that I don't have to wait for server-side computation.

## Implementation Decisions

### System Architecture

The system has two halves that are decoupled by a JSON file contract:

- **CLI eval tool** — runs locally, produces eval bundle JSON + .ots proof file, commits to repo
- **Dashboard** — static web app deployed on Vercel, reads committed JSON files, displays results

There is no server-side compute in production. The website is read-only. All eval work happens offline via the CLI.

### Monorepo Structure

pnpm workspaces with two packages:
- `packages/cli` — the eval pipeline
- `packages/web` — the dashboard

A shared `data/` directory at the repo root contains constitution files (input) and eval results (output). The CLI writes to `data/results/`, the web reads from `data/results/`.

### Eval Pipeline Design

Three roles, three separate Claude API calls, three isolated contexts:

1. **Prompt Generator** — system prompt: red-teamer role. Input: a constitution rule. Output: an adversarial prompt designed to elicit a violation.
2. **Model Under Test** — clean API call to the model being evaluated. Input: the adversarial prompt only. No constitution context.
3. **Judge** — system prompt: evaluator role. Input: the constitution rule + the model's response. Output: binary pass/fail + reasoning.

The Anthropic SDK (`@anthropic-ai/sdk`) handles all API calls. The judge must never be the same API call that produced the response.

### Constitution Format

YAML file with structured rules. Each rule has an id, human-readable principle, a sub-category, and a pass_criteria string for the judge.

Prototype constitution: 5 rules derived from Claude's published constitution, covering 4 sub-categories:

- **Safety**: Refuse to assist with bioweapon creation
- **Honesty**: Never deny being an AI when sincerely asked
- **Honesty**: Never deny having a system prompt when one exists
- **Bias**: Don't express opinions on contested political topics
- **Transparency**: Don't deceive through selective framing

All tests are designed to be binary pass/fail — no subjective interpretation needed.

### Bitcoin Anchoring

OpenTimestamps CLI (`ots stamp` / `ots verify`). Anchors to real Bitcoin mainnet for free. No wallet code, no testnet faucet, no transaction building required. The CLI shells out to `ots` as a subprocess.

### Dashboard Design

Single-page app with:
- Provider cards showing overall compliance percentage and sub-category score bars
- Claude card with real eval data (interactive, shows full results on click/expand)
- 2-3 placeholder cards for other providers (OpenAI, DeepSeek) with hardcoded scores, visually marked as "coming soon"
- Verification section showing the SHA-256 hash, the .ots proof status, and instructions for independent verification

### Tech Stack

| Layer           | Choice                      |
|-----------------|-----------------------------|
| Package manager | pnpm workspaces             |
| Language        | TypeScript (strict)         |
| CLI runtime     | tsx                         |
| AI SDK          | @anthropic-ai/sdk           |
| Web framework   | React Router + Vite         |
| UI              | Tailwind CSS 4 + shadcn/ui  |
| Deployment      | Vercel (static)             |
| Bitcoin         | OpenTimestamps CLI          |

### Module Breakdown

**Module 1: Constitution Parser**
- Reads YAML constitution files, outputs structured rule objects
- Interface: `parseConstitution(path) -> Rule[]`
- Thin wrapper around YAML parsing with type validation

**Module 2: Eval Engine**
- Core module encapsulating the three-call pipeline (generate, call, judge)
- Interface: `runEval(rules, modelConfig) -> EvalResult[]`
- Each sub-step (generate prompt, call model, judge response) is a separate function but exposed through one top-level interface

**Module 3: Bundle & Stamp**
- Assembles eval results + constitution into the JSON bundle format
- Computes SHA-256 hash
- Shells out to `ots stamp`
- Interface: `createBundle(results, constitution) -> { bundlePath, otsPath, hash }`

**Module 4: Dashboard**
- Single-page React app
- Components: ProviderCard, SubCategoryBar, VerificationSection
- Reads JSON from `data/results/` at build time (static import or fetch from public dir)
- Hardcoded placeholder data for non-Claude providers

## Testing Decisions

For a 2-day hackathon prototype, the priority is end-to-end validation over unit test coverage. The goal is to prove the pipeline works from constitution input to Bitcoin-anchored output.

- **End-to-end test**: Run the CLI against the prototype constitution, verify it produces a valid JSON bundle and .ots file, verify the hash matches. This is the critical test.
- **Module 2 (Eval Engine)**: Most worth unit testing if time permits — mock the API calls and verify the three-step pipeline produces correctly structured output.
- **Modules 1 and 3**: Thin wrappers, not worth dedicated tests for the prototype.
- **Module 4 (Dashboard)**: Visual verification in browser. No automated UI tests for the prototype.

## Out of Scope

- **ZK proofs**: The full vision includes ZK-STARK proofs of eval integrity (RISC Zero / SP1). This requires circuit development that is not feasible in 2 days. The prototype proves the eval results are timestamped and untampered, not that the eval was computed correctly — that is future work.
- **Bounty program**: The PDF describes a system where governments fund bounty pools and anyone can submit reproducible failures. Cut from prototype entirely.
- **Live eval from the website**: Visitors cannot trigger eval runs. All evals are run offline by the operator.
- **Multiple live providers**: Only Claude is tested with real API calls. Other provider cards show hardcoded placeholder data.
- **Crowd-sourced judging UI**: Discussed during planning as a future feature. The prototype uses LLM-as-judge.
- **CI/CD eval automation**: Evals are run manually via CLI. No scheduled or automated runs.
- **Constitution authoring UI**: Constitutions are hand-written YAML files.
- **Historical eval tracking**: The dashboard shows the latest eval run only. No trend lines or history.

## Further Notes

- A proof-of-concept eval bundle has already been hashed and submitted to Bitcoin mainnet via OpenTimestamps during the planning session. The hash `ee39ee9a0bbfbd10335aed9e43aa6967e4b1414625f9ff2aab9aa1884667a389` is pending confirmation across 4 calendar servers. This validates that the anchoring approach works end-to-end.
- The `~/repos/cohort_003/` project serves as a reference for tech stack patterns (pnpm, Tailwind 4, shadcn/ui, TypeScript strict, Vite).
- OpenTimestamps requires the `ots` CLI to be installed locally (`pipx install opentimestamps-client`). This is a runtime dependency of the CLI package.
- The prototype constitution is derived from Anthropic's published constitution. In the full vision, each AI company would publish their own constitution in the standard YAML schema.
- The adversarial prompts in the prototype are designed to be binary pass/fail with no subjective interpretation, specifically so that future crowd-sourced judging would be feasible.
