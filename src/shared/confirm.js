const CONFIRMED = "confirm";

// Built on first use and kept, so that the pages carry no markup for it and
// only one dialog is ever added to the document.
let elements = null;

/**
 * Asks the user to agree to something before it happens, for the changes that
 * cannot be taken back.
 *
 * @param question what is about to happen, phrased as a question.
 * @param note anything else the user should know before answering.
 * @returns whether the user agreed.
 */
export function askToConfirm(question, note = "") {
  const { dialog, questionText, noteText } = (elements ??= build());

  questionText.textContent = question;
  noteText.textContent = note;
  noteText.hidden = note === "";

  // Escape closes the dialog without a button, and would otherwise leave the
  // answer given the last time it was opened.
  dialog.returnValue = "";
  dialog.showModal();

  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === CONFIRMED), {
      once: true,
    });
  });
}

function build() {
  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog";

  // A dialog form closes the dialog on submit and reports which button was
  // used, so neither needs a handler of its own.
  dialog.innerHTML = `
    <form method="dialog">
      <p class="confirm-dialog__question"></p>
      <p class="confirm-dialog__note" hidden></p>
      <div class="confirm-dialog__actions">
        <button class="btn-ghost" value="cancel">Cancel</button>
        <button class="btn" value="${CONFIRMED}">Confirm</button>
      </div>
    </form>
  `;

  document.body.append(dialog);

  return {
    dialog,
    questionText: dialog.querySelector(".confirm-dialog__question"),
    noteText: dialog.querySelector(".confirm-dialog__note"),
  };
}
