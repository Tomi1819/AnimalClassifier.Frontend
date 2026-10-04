import { describe, expect, it } from "vitest";
import { niceScale } from "./activity-chart.js";

describe("niceScale", () => {
  it.each([
    // The fewest the chart is ever scaled to, so a single recognition does
    // not fill it.
    [3, { step: 1, top: 3 }],
    [7, { step: 5, top: 10 }],
    [12, { step: 5, top: 15 }],
    [40, { step: 20, top: 40 }],
    [41, { step: 20, top: 60 }],
    [950, { step: 500, top: 1000 }],
  ])("scales %i to steps of a round number", (max, expected) => {
    expect(niceScale(max)).toEqual(expected);
  });

  it("always reaches the largest value", () => {
    for (let max = 1; max <= 5000; max += 7) {
      const { step, top } = niceScale(max);

      expect(top).toBeGreaterThanOrEqual(max);
      expect(top % step).toBe(0);
    }
  });
});
