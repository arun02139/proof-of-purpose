import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Overlay } from "./overlay";
import { ModelView } from "./model-view";
import { QuestionsView } from "./questions-view";
import type { Category, ConstitutionRule, Submission } from "shared";
import { useState } from "react";

// Minimal test harness that replicates the three-state navigation from home.tsx
type ViewState =
  | "dashboard"
  | { view: "model" }
  | { view: "questions"; category: Category };

const testRules: ConstitutionRule[] = [
  {
    id: "safety-1",
    principle: "Test rule",
    category: "safety",
    prompts: [
      { question_id: "q1", text: "Test prompt", expected_answer: "No" },
    ],
  },
];

function TestNavigation() {
  const [viewState, setViewState] = useState<ViewState>("dashboard");

  return (
    <div>
      {/* Dashboard */}
      {viewState === "dashboard" && (
        <div>
          <p>Dashboard</p>
          <button onClick={() => setViewState({ view: "model" })}>
            Anthropic Card
          </button>
        </div>
      )}

      {/* Model View overlay */}
      {viewState !== "dashboard" && viewState.view === "model" && (
        <Overlay onDismiss={() => setViewState("dashboard")}>
          <ModelView
            providerName="Anthropic"
            modelName="claude-opus-4"
            onCategoryClick={(category) =>
              setViewState({ view: "questions", category })
            }
          />
        </Overlay>
      )}

      {/* Questions View overlay */}
      {viewState !== "dashboard" && viewState.view === "questions" && (
        <Overlay onDismiss={() => setViewState({ view: "model" })}>
          <QuestionsView
            category={viewState.category}
            rules={testRules.filter((r) => r.category === viewState.category)}
            submissions={new Map<string, Submission>()}
          />
        </Overlay>
      )}
    </div>
  );
}

describe("Navigation state machine", () => {
  it("starts on the Dashboard", () => {
    render(<TestNavigation />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("Dashboard → Model View: clicking Anthropic card opens Model View", async () => {
    const user = userEvent.setup();
    render(<TestNavigation />);

    await user.click(screen.getByText("Anthropic Card"));

    // Model View should be visible
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("claude-opus-4")).toBeInTheDocument();
    // Dashboard content should be gone
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("Model View → Questions View: clicking category node opens Questions View", async () => {
    const user = userEvent.setup();
    render(<TestNavigation />);

    // Navigate to Model View
    await user.click(screen.getByText("Anthropic Card"));

    // Click the Safety category node
    await user.click(screen.getByText("Safety"));

    // Questions View should be visible
    expect(screen.getByText("Test rule")).toBeInTheDocument();
    expect(screen.getByText("Test prompt")).toBeInTheDocument();
  });

  it("Questions View → Model View: clicking backdrop returns to Model View", async () => {
    const user = userEvent.setup();
    render(<TestNavigation />);

    // Navigate to Model View → Questions View
    await user.click(screen.getByText("Anthropic Card"));
    await user.click(screen.getByText("Safety"));

    // Click the backdrop using fireEvent (userEvent clicks center, landing on card)
    const backdrop = screen.getByText("Test prompt").closest(".fixed")!;
    fireEvent.click(backdrop);

    // Should be back at Model View
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("claude-opus-4")).toBeInTheDocument();
    expect(screen.queryByText("Test prompt")).not.toBeInTheDocument();
  });

  it("Model View → Dashboard: clicking backdrop returns to Dashboard", async () => {
    const user = userEvent.setup();
    render(<TestNavigation />);

    // Navigate to Model View
    await user.click(screen.getByText("Anthropic Card"));

    // Click the backdrop using fireEvent
    const backdrop = screen.getByText("Anthropic").closest(".fixed")!;
    fireEvent.click(backdrop);

    // Should be back at Dashboard
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
