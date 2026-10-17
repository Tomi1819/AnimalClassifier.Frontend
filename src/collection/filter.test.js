import { describe, expect, it } from "vitest";
import { COLLECTION_FILTER, filterAnimals, isFound } from "./filter.js";

const bear = { animalName: "bear", count: 3 };
const cat = { animalName: "cat", count: 0 };
const dog = { animalName: "dog", count: 1 };
const animals = [bear, cat, dog];

describe("isFound", () => {
  it.each([
    [bear, true],
    [dog, true],
    [cat, false],
  ])("tells whether %o is found", (animal, expected) => {
    expect(isFound(animal)).toBe(expected);
  });
});

describe("filterAnimals", () => {
  it.each([
    [COLLECTION_FILTER.ALL, [bear, cat, dog]],
    [COLLECTION_FILTER.FOUND, [bear, dog]],
    [COLLECTION_FILTER.NOT_FOUND, [cat]],
  ])("lets through the animals %s shows, in their order", (filter, expected) => {
    expect(filterAnimals(animals, filter)).toEqual(expected);
  });
});
