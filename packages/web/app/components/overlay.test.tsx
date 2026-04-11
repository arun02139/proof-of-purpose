import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Overlay } from "./overlay";

describe("Overlay", () => {
  it("renders children inside the overlay", () => {
    render(
      <Overlay onDismiss={() => {}}>
        <p>Card content</p>
      </Overlay>,
    );
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("fires onDismiss when the backdrop is clicked", () => {
    const onDismiss = vi.fn();

    render(
      <Overlay onDismiss={onDismiss}>
        <p>Card content</p>
      </Overlay>,
    );

    // fireEvent.click dispatches directly on the target element,
    // unlike userEvent which clicks the center (landing on the inner card)
    const backdrop = screen.getByText("Card content").closest(".fixed")!;
    fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not fire onDismiss when card content is clicked", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(
      <Overlay onDismiss={onDismiss}>
        <button>Card content</button>
      </Overlay>,
    );

    await user.click(screen.getByText("Card content"));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
