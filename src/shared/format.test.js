import { describe, expect, it } from "vitest";
import { formatFileSize, pluralize } from "./format.js";

describe("pluralize", () => {
  it.each([
    [0, "0 images"],
    [1, "1 image"],
    [2, "2 images"],
  ])("counts %i", (value, expected) => {
    expect(pluralize(value, "image")).toBe(expected);
  });

  it("writes the number as the locale does", () => {
    expect(pluralize(1204, "image")).toBe(`${new Intl.NumberFormat().format(1204)} images`);
  });
});

describe("formatFileSize", () => {
  it.each([
    [0, "0 B"],
    [820, "820 B"],
    [1536, "1.5 KB"],
    [5 * 1024 * 1024, "5.0 MB"],
    [12.4 * 1024 * 1024, "12 MB"],
    [3 * 1024 ** 4, "3072 GB"],
  ])("writes %i bytes as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});
