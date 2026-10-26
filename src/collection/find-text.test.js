import { describe, expect, it } from "vitest";
import { FIND_STATUS } from "../api/recognitions.js";
import { describeFind } from "./find-text.js";

const find = (status, animalName = "badger") => ({ status, animalName, foundCount: 24, knownCount: 90 });

describe("describeFind", () => {
  it("celebrates the first find, with how far the collection is", () => {
    expect(describeFind(find(FIND_STATUS.FIRST_FIND), { canConfirm: true })).toBe(
      "Your first badger! That makes 24 of 90 in your collection.",
    );
  });

  it("mentions an animal found already", () => {
    expect(describeFind(find(FIND_STATUS.ALREADY_FOUND), { canConfirm: true })).toBe(
      "Already in your collection: badger.",
    );
  });

  it("asks to confirm an animal the model was not sure enough of", () => {
    expect(describeFind(find(FIND_STATUS.UNCONFIRMED), { canConfirm: true })).toBe(
      "The model is not sure enough to add this badger to your collection. If it is right, say so below and it joins.",
    );
  });

  // A video takes no feedback, so there is nothing for the user to say.
  it("only explains an animal the model was not sure enough of when it cannot be confirmed", () => {
    expect(describeFind(find(FIND_STATUS.UNCONFIRMED), { canConfirm: false })).toBe(
      "The model is not sure enough to add this badger to your collection.",
    );
  });

  it("says nothing of a recognition that finds no animal the model knows", () => {
    expect(describeFind(find(FIND_STATUS.NONE, null), { canConfirm: true })).toBeNull();
  });
});
