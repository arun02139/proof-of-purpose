import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./home";

const mockConstitution = {
  provider: "Anthropic",
  model: "claude-opus-4",
  rules: [
    {
      id: "r1",
      text: "Test rule",
      category: "safety",
      prompts: [
        { question_id: "q1", text: "Test?", expected_answer: "Yes" },
      ],
    },
  ],
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (urlStr.includes("/api/constitution")) {
      return new Response(JSON.stringify(mockConstitution), { status: 200 });
    }
    if (urlStr.includes("/api/submissions")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    return new Response("", { status: 404 });
  });
});

describe("Shield icon click", () => {
  it("logs out when clicked while logged in", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Anthropic")).toBeInTheDocument();
    });

    // Log in
    const loginBtn = screen.getByRole("button", { name: /login/i });
    await user.click(loginBtn);

    // Should now show "Logout"
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByText("Auditor Dashboard")).toBeInTheDocument();

    // Click the shield icon
    const shieldBtn = screen.getByTitle("Reset submission data");
    await user.click(shieldBtn);

    // Should now be logged out
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Provider Trust Scores")).toBeInTheDocument();
  });

  it("resets submissions when clicked while logged out", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Anthropic")).toBeInTheDocument();
    });

    // Click shield while logged out
    const shieldBtn = screen.getByTitle("Reset submission data");
    await user.click(shieldBtn);

    // Should have called DELETE /api/submissions
    expect(fetchSpy).toHaveBeenCalledWith("/api/submissions", { method: "DELETE" });
  });
});
