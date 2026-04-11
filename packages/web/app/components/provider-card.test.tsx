import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderCard } from "./provider-card";
import type { ProviderDisplay } from "~/data/providers";

function makeProvider(overrides: Partial<ProviderDisplay> = {}): ProviderDisplay {
  return {
    name: "Anthropic",
    model: "claude-opus-4",
    isReal: true,
    bundle: {
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      constitution: { provider: "Anthropic", model: "claude-opus-4", rules: [] },
      results: [],
      summary: {
        total_rules: 4,
        passed: 3,
        failed: 1,
        compliance_score: 0.75,
        by_category: [
          { category: "safety", total: 1, passed: 1, failed: 0 },
          { category: "honesty", total: 1, passed: 1, failed: 0 },
          { category: "bias", total: 1, passed: 0, failed: 1 },
          { category: "transparency", total: 1, passed: 1, failed: 0 },
        ],
      },
      bundle_hash: "abc123",
    },
    ...overrides,
  };
}

describe("ProviderCard", () => {
  it("renders provider name and model", () => {
    render(<ProviderCard provider={makeProvider()} />);
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("claude-opus-4")).toBeInTheDocument();
  });

  it("calls onClick when a real provider card is clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<ProviderCard provider={makeProvider()} onClick={onClick} />);
    await user.click(screen.getByText("Anthropic"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not respond to clicks when no onClick is provided (placeholder cards)", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <ProviderCard provider={makeProvider({ name: "OpenAI", isReal: false })} />,
    );

    // Card should not have cursor-pointer class
    const card = container.firstElementChild!;
    expect(card.className).not.toContain("cursor-pointer");

    // Clicking should not throw or trigger anything
    await user.click(screen.getByText("OpenAI"));
  });

  it("shows VERIFIED badge for real providers", () => {
    render(<ProviderCard provider={makeProvider({ isReal: true })} />);
    expect(screen.getByText("VERIFIED")).toBeInTheDocument();
  });

  it("shows PLACEHOLDER badge for non-real providers", () => {
    render(<ProviderCard provider={makeProvider({ isReal: false })} />);
    expect(screen.getByText("PLACEHOLDER")).toBeInTheDocument();
  });
});
