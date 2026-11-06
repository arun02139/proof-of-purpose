import { describe, it, expect } from "vitest";
import { STAMP_BODY, STAMP_RESPONSES } from "../test/fixtures";
import { CALENDARS, stamp } from "./anchoring";
import { MAX_CALENDAR_RESPONSE, fromHex, walkProof } from "./ots";

/** A body streamed in small chunks, so the cap must trip mid-stream. */
function streamed(size: number): Response {
  let sent = 0;
  return new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= size) return controller.close();
        const n = Math.min(1000, size - sent);
        sent += n;
        controller.enqueue(new Uint8Array(n));
      },
    }),
  );
}

const real = Object.values(STAMP_RESPONSES).map(fromHex);

describe("stamp: calendar response cap", () => {
  it("drops a calendar whose response runs past the cap and keeps the rest", async () => {
    const fetchFn: typeof fetch = async (input) =>
      String(input).startsWith(CALENDARS[0])
        ? streamed(MAX_CALENDAR_RESPONSE + 1)
        : new Response(real[1]);
    const ots = await stamp(STAMP_BODY, fetchFn);
    expect(ots).not.toBeNull();
    expect(walkProof(fromHex(ots!)).pending).toHaveLength(CALENDARS.length - 1);
  });

  it("returns null when every response is over the cap", async () => {
    const fetchFn: typeof fetch = async () => streamed(MAX_CALENDAR_RESPONSE + 1);
    expect(await stamp(STAMP_BODY, fetchFn)).toBeNull();
  });
});
