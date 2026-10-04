/**
 * Builds an element with its class and its text, the two things nearly every
 * element a page builds in script needs.
 *
 * @param text set as text, never as markup, so that it is safe for whatever
 *   the user or the backend put in it.
 */
export function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}
