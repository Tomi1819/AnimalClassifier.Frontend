import { describe, expect, it } from "vitest";
import { REVIEW_STATUS, VERDICT } from "../api/feedback.js";
import { describeTraining, describeVerdict, findKnownAnimal } from "./feedback-text.js";

describe("describeVerdict", () => {
  it.each([
    [{ verdict: VERDICT.CORRECT, actualAnimal: null }, "Correct"],
    [{ verdict: VERDICT.WRONG_ANIMAL, actualAnimal: "coyote" }, "Corrected to coyote"],
    [{ verdict: VERDICT.UNLISTED_ANIMAL, actualAnimal: "capybara" }, "Not in the list: capybara"],
  ])("describes %o", (feedback, expected) => {
    expect(describeVerdict(feedback)).toBe(expected);
  });
});

describe("describeTraining", () => {
  it.each([
    [REVIEW_STATUS.PENDING, "Waiting for review"],
    [REVIEW_STATUS.ACCEPTED, "Accepted for training"],
    [REVIEW_STATUS.REJECTED, "Not accepted for training"],
  ])("describes a review that is %s", (reviewStatus, expected) => {
    expect(describeTraining({ allowsTraining: true, reviewStatus })).toBe(expected);
  });

  // Nobody reviews it, so its review says nothing.
  it("leaves the review out when training is not allowed", () => {
    expect(describeTraining({ allowsTraining: false, reviewStatus: REVIEW_STATUS.PENDING })).toBe(
      "Not used for training",
    );
  });
});

describe("findKnownAnimal", () => {
  const knownAnimals = ["coyote", "guinea pig", "wolf"];

  it.each([
    ["coyote", "coyote"],
    ["  Coyote ", "coyote"],
    ["GUINEA   pig", "guinea pig"],
  ])("finds %j", (typed, expected) => {
    expect(findKnownAnimal(knownAnimals, typed)).toBe(expected);
  });

  it.each(["capybara", "coy", ""])("does not find %j", (typed) => {
    expect(findKnownAnimal(knownAnimals, typed)).toBeNull();
  });
});
