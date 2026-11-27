/**
 * A line under a recognition's result that the backend has to be asked for,
 * such as what the recognition did for the user's collection. Only the last
 * question asked may draw its answer, so one that arrives after the user has
 * moved on to another recognition is dropped. If the backend cannot answer,
 * the result stands without the line.
 *
 * @param slot the element the line is drawn in.
 * @param subject what the line tells, for the log, such as "what the
 *   recognition found".
 * @param load called with the recognition's id, to ask the backend.
 * @param build called with the answer and the recognition, which returns the
 *   elements to draw, none when there is nothing to say.
 * @returns `show(recognition)`, which asks the backend afresh each time, as
 *   what the user says of a recognition can change the answer, and `hide()`.
 */
export function initRecognitionNote(slot, { subject, load, build }) {
  let latest = null;

  return {
    show: async (recognition) => {
      // The same recognition keeps its line until the new one arrives, rather
      // than blinking out while its feedback is sent.
      if (recognition.id !== latest?.recognitionId) {
        slot.replaceChildren();
      }

      const asked = { recognitionId: recognition.id };
      latest = asked;

      let answer;
      try {
        answer = await load(recognition.id);
      } catch (error) {
        console.error(`Could not load ${subject}:`, error);
        return;
      }

      if (latest === asked) {
        slot.replaceChildren(...build(answer, recognition));
      }
    },
    hide: () => {
      latest = null;
      slot.replaceChildren();
    },
  };
}
