/**
 * Which of the animals the collection page shows, as its filter buttons name
 * them in `data-collection-filter`.
 */
export const COLLECTION_FILTER = Object.freeze({
  ALL: "all",
  FOUND: "found",
  NOT_FOUND: "not-found",
});

/**
 * Whether the user has recognised the animal at least once.
 *
 * @param animal one of the collection's animals, as `getCollection` gives it.
 */
export function isFound(animal) {
  return animal.count > 0;
}

/**
 * The animals the filter lets through, in the order they were given.
 *
 * @param filter one of COLLECTION_FILTER.
 */
export function filterAnimals(animals, filter) {
  switch (filter) {
    case COLLECTION_FILTER.FOUND:
      return animals.filter(isFound);
    case COLLECTION_FILTER.NOT_FOUND:
      return animals.filter((animal) => !isFound(animal));
    default:
      return animals;
  }
}
