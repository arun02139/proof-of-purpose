# Ubiquitous Language

## Actors

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Auditor** | A person who tests an AI model against its constitution, submits results, and demos the system | Operator, evaluator, tester, demo presenter |
| **Visitor** | A person who views the dashboard without submitting results | Viewer, guest |
| **Admin** | Whoever holds the Worker's `ADMIN_TOKEN` secret, and so can wipe all submissions through the API. Not a dashboard role: there is no admin UI | Superuser, owner |
| **Provider** | An AI company whose model is subject to constitutional evaluation | Vendor, company |

## Constitution

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Constitution** | A machine-readable YAML document defining the safety rules a provider's model claims to follow | Policy, spec, config |
| **Rule** | A single testable principle within a constitution, identified by a unique `rule_id` | Constraint, requirement, norm |
| **Prompt** | An adversarial question designed to tempt a model into violating a rule, with an expected yes/no answer | Question, probe, adversarial prompt |
| **Category** | A classification of rules into one of: safety, honesty, bias, transparency | Group, domain, bucket |

## Audit lifecycle

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Submission** | An auditor's recorded answer and hash for a specific prompt, stored as exact JSON bytes in a D1 row on the server | Eval bundle, result, response, entry |
| **Hash** | A SHA-256 string that accompanies a submission, computed client-side in Claude Code to attest the answer was not fabricated | Seal, signature, digest |
| **Verdict** | The pass or fail outcome of a submission, determined by whether the model's first word matches the expected answer | Score, result, judgement |
| **Anchor** | An OpenTimestamps proof that a submission's content existed at a specific moment, confirmed on the Bitcoin blockchain | Timestamp, stamp, proof, receipt |
| **Compliance Score** | The percentage of prompts for a provider that received a passing verdict | Trust score, rating, grade |

## Relationships

- A **Constitution** belongs to exactly one **Provider** and contains one or more **Rules**
- A **Rule** belongs to exactly one **Category** and contains one or more **Prompts**
- A **Submission** references exactly one **Prompt** and contains one **Hash**
- A **Submission** produces exactly one **Verdict** (pass or fail)
- A **Submission** may have zero or one **Anchors** (absent until OpenTimestamps confirms)
- A **Compliance Score** is computed from all **Verdicts** for a given **Provider**

## Example dialogue

> **Dev:** "When an **Auditor** copies a **Prompt** from the dashboard and runs it in Claude Code, what comes back?"
>
> **Domain expert:** "The model's answer plus a **Hash**. The **Hash** is computed client-side so the **Auditor** can't change the answer after the fact."
>
> **Dev:** "And when they paste the answer and **Hash** into the dashboard and hit submit?"
>
> **Domain expert:** "The server creates a **Submission**, computes the **Verdict** — pass or fail based on the first word matching the expected answer — and then calls OpenTimestamps to create an **Anchor**."
>
> **Dev:** "What if OpenTimestamps is down?"
>
> **Domain expert:** "The **Submission** and **Verdict** still exist. The **Anchor** is just absent — the dashboard shows 'pending' instead of a mempool.space link. It doesn't block anything."
>
> **Dev:** "And the **Compliance Score** on the provider card?"
>
> **Domain expert:** "It recomputes from all **Verdicts** for that **Provider**. Every new **Submission** can change it."

## Flagged ambiguities

- **"hash"** is used in two contexts: (1) the client-side **Hash** that an **Auditor** submits alongside an answer, and (2) the SHA-256 digest of the **Submission** JSON bytes that get stamped by OpenTimestamps. In the current prototype both happen to be SHA-256, but they serve different purposes. For the hackathon this overload is acceptable; if the signing mechanism becomes real, these should be distinguished.
- **"eval bundle"** still appears in the CLI codebase (`buildBundle`, `EvalBundle` type, `*-eval-bundle.json` filenames). In the live deployed system the concept is replaced by per-prompt **Submissions**. The CLI remains functional for local use but its terminology is legacy.
- **"question" vs "prompt"** — both appear in conversation and UI copy. **Prompt** is canonical in the domain model and code; "question" is acceptable in user-facing dashboard text.
