// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { initRecognitionNote } from "./recognition-note.js";

// A load whose answers arrive only when the test says, one per question.
function deferredLoad() {
  const pending = new Map();
  const load = vi.fn((id) => new Promise((resolve, reject) => pending.set(id, { resolve, reject })));
  return { load, answer: (id, value) => pending.get(id).resolve(value), fail: (id) => pending.get(id).reject(new Error("down")) };
}

const build = (answer) => [Object.assign(document.createElement("p"), { textContent: answer })];

function setUp() {
  const slot = document.createElement("div");
  const { load, answer, fail } = deferredLoad();
  const note = initRecognitionNote(slot, { subject: "the test line", load, build });
  return { slot, note, load, answer, fail };
}

const flush = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => vi.restoreAllMocks());

describe("initRecognitionNote", () => {
  it("draws the answer for the recognition shown", async () => {
    const { slot, note, load, answer } = setUp();

    note.show({ id: 7 });
    answer(7, "Found");
    await flush();

    expect(load).toHaveBeenCalledWith(7);
    expect(slot.textContent).toBe("Found");
  });

  it("drops an answer that arrives after another recognition was shown", async () => {
    const { slot, note, answer } = setUp();

    note.show({ id: 1 });
    note.show({ id: 2 });
    answer(2, "Second");
    answer(1, "First");
    await flush();

    expect(slot.textContent).toBe("Second");
  });

  it("drops an answer that arrives after the result was hidden", async () => {
    const { slot, note, answer } = setUp();

    note.show({ id: 1 });
    note.hide();
    answer(1, "Late");
    await flush();

    expect(slot.textContent).toBe("");
  });

  // Asked again once its feedback changes, it should not blink out meanwhile.
  it("keeps the line of the same recognition until its new answer arrives", async () => {
    const { slot, note, answer } = setUp();

    note.show({ id: 1 });
    answer(1, "Before");
    await flush();

    note.show({ id: 1 });
    expect(slot.textContent).toBe("Before");
  });

  it("clears the line of another recognition at once", async () => {
    const { slot, note, answer } = setUp();

    note.show({ id: 1 });
    answer(1, "First");
    await flush();

    note.show({ id: 2 });
    expect(slot.textContent).toBe("");
  });

  it("leaves the line out when the backend cannot answer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { slot, note, fail } = setUp();

    note.show({ id: 1 });
    fail(1);
    await flush();

    expect(slot.textContent).toBe("");
    expect(console.error).toHaveBeenCalledWith("Could not load the test line:", expect.any(Error));
  });
});
