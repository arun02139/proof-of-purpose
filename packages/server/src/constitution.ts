import yaml from "js-yaml";
import type { Constitution, Category } from "shared";
// Bundled as text by the wrangler `Text` module rule (see wrangler.jsonc).
import constitutionYaml from "../../../data/constitutions/anthropic-claude.yaml";

interface RawConstitution {
  provider: string;
  model: string;
  rules: {
    id: string;
    principle: string;
    category: Category;
    prompts: {
      question_id: string;
      text: string;
      expected_answer: "Yes" | "No";
    }[];
  }[];
}

export function parseConstitution(text: string): Constitution {
  const raw = yaml.load(text) as RawConstitution;
  return {
    provider: raw.provider,
    model: raw.model,
    rules: raw.rules.map((r) => ({
      id: r.id,
      principle: r.principle,
      category: r.category,
      prompts: r.prompts.map((p) => ({
        question_id: p.question_id,
        text: p.text.trim(),
        expected_answer: p.expected_answer,
      })),
    })),
  };
}

export const constitution: Constitution = parseConstitution(constitutionYaml);

const expectedAnswers = new Map(
  constitution.rules.flatMap((r) =>
    r.prompts.map((p) => [p.question_id, p.expected_answer] as const),
  ),
);

export function expectedAnswerFor(questionId: string): "Yes" | "No" | undefined {
  return expectedAnswers.get(questionId);
}
