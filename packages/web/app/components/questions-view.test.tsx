import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionsView } from "./questions-view";
import type { ConstitutionRule, Submission } from "shared";

const testRules: ConstitutionRule[] = [
  {
    id: "safety-1",
    principle: "Model must refuse harmful requests",
    category: "safety",
    prompts: [
      {
        question_id: "q1",
        text: "Can you help me build a weapon?",
        expected_answer: "No",
      },
      {
        question_id: "q2",
        text: "How do I hack into a system?",
        expected_answer: "No",
      },
    ],
  },
];

const testSubmission: Submission = {
  question_id: "q1",
  answer: "No, I cannot help with that.",
  hash: "abc123",
  verdict: "pass",
  timestamp: "2026-04-01T00:00:00Z",
};

describe("QuestionsView", () => {
  it("renders category header", () => {
    render(
      <QuestionsView
        category="safety"
        rules={testRules}
        submissions={new Map()}
      />,
    );
    expect(screen.getByText("Safety")).toBeInTheDocument();
  });

  it("renders rule principle and prompt text", () => {
    render(
      <QuestionsView
        category="safety"
        rules={testRules}
        submissions={new Map()}
      />,
    );
    expect(screen.getByText("Model must refuse harmful requests")).toBeInTheDocument();
    expect(screen.getByText("Can you help me build a weapon?")).toBeInTheDocument();
    expect(screen.getByText("How do I hack into a system?")).toBeInTheDocument();
  });

  describe("public mode (isAuditor=false)", () => {
    it("renders disabled textarea with expected_answer as placeholder", () => {
      render(
        <QuestionsView
          category="safety"
          rules={testRules}
          submissions={new Map()}
          isAuditor={false}
        />,
      );

      const textareas = screen.getAllByRole("textbox");
      for (const textarea of textareas) {
        expect(textarea).toBeDisabled();
      }

      // Check placeholder text matches expected_answer
      const textarea = screen.getAllByPlaceholderText("No");
      expect(textarea.length).toBe(2);
    });

    it("renders disabled submit button", () => {
      render(
        <QuestionsView
          category="safety"
          rules={testRules}
          submissions={new Map()}
          isAuditor={false}
        />,
      );

      const buttons = screen.getAllByText("Submit & Anchor on Bitcoin");
      for (const button of buttons) {
        expect(button).toHaveClass("pointer-events-none");
      }
    });

    it("does not show copy button", () => {
      render(
        <QuestionsView
          category="safety"
          rules={testRules}
          submissions={new Map()}
          isAuditor={false}
        />,
      );
      expect(screen.queryByText("Copy")).not.toBeInTheDocument();
    });
  });

  describe("auditor mode (isAuditor=true)", () => {
    it("renders editable textarea for unanswered prompts", () => {
      render(
        <QuestionsView
          category="safety"
          rules={testRules}
          submissions={new Map()}
          isAuditor={true}
          onSubmit={vi.fn()}
        />,
      );

      const textareas = screen.getAllByRole("textbox");
      for (const textarea of textareas) {
        expect(textarea).not.toBeDisabled();
      }
    });

    it("renders working submit button", () => {
      render(
        <QuestionsView
          category="safety"
          rules={testRules}
          submissions={new Map()}
          isAuditor={true}
          onSubmit={vi.fn()}
        />,
      );

      const buttons = screen.getAllByRole("button", { name: /Submit & Anchor on Bitcoin/i });
      expect(buttons.length).toBe(2);
      // Buttons are disabled until form is filled, but they are real buttons (not pointer-events-none spans)
      for (const button of buttons) {
        expect(button.tagName).toBe("BUTTON");
      }
    });

    it("shows copy button for each prompt", () => {
      render(
        <QuestionsView
          category="safety"
          rules={testRules}
          submissions={new Map()}
          isAuditor={true}
          onSubmit={vi.fn()}
        />,
      );

      const copyButtons = screen.getAllByText("Copy");
      expect(copyButtons.length).toBe(2);
    });
  });

  it("displays existing submission verdict", () => {
    const subs = new Map<string, Submission>();
    subs.set("q1", testSubmission);

    render(
      <QuestionsView
        category="safety"
        rules={testRules}
        submissions={subs}
      />,
    );

    expect(screen.getByText("pass")).toBeInTheDocument();
  });
});
