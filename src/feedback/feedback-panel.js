import {
  getKnownAnimals,
  giveFeedback,
  MAX_ANIMAL_LENGTH,
  MAX_COMMENT_LENGTH,
  VERDICT,
  withdrawFeedback,
} from "../api/feedback.js";
import { askToConfirm } from "../shared/confirm.js";
import { createElement } from "../shared/dom.js";
import { hideMessage, showError } from "../shared/feedback.js";
import { describeTraining, describeVerdict, findKnownAnimal } from "./feedback-text.js";

const UNKNOWN_ANIMAL = "Choose an animal from the list, or say that it is not in it.";
const WITHDRAW_QUESTION = "Withdraw your feedback?";
const WITHDRAW_NOTE = "The model will not be trained on this image from now on.";

// A page can hold several panels, and each one's fields need ids of their own
// for their labels.
let panelCount = 0;

// Asked for once a page, the first time a form opens, since every panel offers
// the same animals. A request that fails is made again the next time.
let knownAnimals = null;

/**
 * The part of an image's recognition that asks the user whether the model
 * named the right animal, and shows what they said. It is a question until
 * they answer, and their answer after, and either opens into a form to give or
 * change it.
 *
 * @param recognition `{ id, feedback }`, where `feedback` is what the user said
 *   of it before, if anything.
 * @param onChange called with the feedback as the backend kept it, or with
 *   null once it is withdrawn.
 * @returns the panel's element.
 */
export function createFeedbackPanel(recognition, { onChange = () => {} } = {}) {
  const parts = build();
  const state = { recognitionId: recognition.id, feedback: recognition.feedback ?? null, onChange };

  parts.yes.addEventListener("click", () => openForm(parts, state, VERDICT.CORRECT));
  parts.no.addEventListener("click", () => openForm(parts, state, VERDICT.WRONG_ANIMAL));
  parts.change.addEventListener("click", () => openForm(parts, state, state.feedback.verdict));
  parts.withdraw.addEventListener("click", () => withdraw(parts, state));
  parts.cancel.addEventListener("click", () => showCurrent(parts, state, { focus: true }));
  for (const choice of parts.verdicts) {
    choice.addEventListener("change", () => showVerdictFields(parts));
  }
  parts.form.addEventListener("submit", (event) => {
    event.preventDefault();
    submit(parts, state);
  });

  showCurrent(parts, state);
  return parts.panel;
}

function build() {
  const id = `feedback-${++panelCount}`;

  const panel = createElement("div", "feedback-panel");
  panel.innerHTML = `
    <div class="feedback-panel__question">
      <span class="feedback-panel__prompt">Was this right?</span>
      <button type="button" class="btn-ghost" data-part="yes">Yes</button>
      <button type="button" class="btn-ghost" data-part="no">No</button>
    </div>

    <div class="feedback-panel__answer" hidden>
      <p class="feedback-panel__verdict">
        Your feedback: <strong data-part="verdict"></strong>
      </p>
      <p class="feedback-panel__note" data-part="training"></p>
      <p class="feedback-panel__comment" data-part="comment" hidden></p>
      <div class="feedback-panel__actions">
        <button type="button" class="btn-ghost" data-part="change">Change</button>
        <button type="button" class="btn-ghost" data-part="withdraw">Withdraw</button>
      </div>
    </div>

    <form class="feedback-form" hidden>
      <fieldset class="feedback-form__verdicts">
        <legend class="field__label">Did the model get it right?</legend>
        <label class="feedback-form__choice">
          <input type="radio" name="${id}-verdict" value="${VERDICT.CORRECT}" required />
          Yes, it did
        </label>
        <label class="feedback-form__choice">
          <input type="radio" name="${id}-verdict" value="${VERDICT.WRONG_ANIMAL}" />
          No, it is another animal
        </label>
        <label class="feedback-form__choice">
          <input type="radio" name="${id}-verdict" value="${VERDICT.UNLISTED_ANIMAL}" />
          No, and the animal is not in the list
        </label>
      </fieldset>

      <div class="feedback-form__field" data-verdict="${VERDICT.WRONG_ANIMAL}" hidden>
        <label class="field__label" for="${id}-known">Which animal is it?</label>
        <input id="${id}-known" list="${id}-animals" autocomplete="off" data-part="knownAnimal" />
        <datalist id="${id}-animals" data-part="animalList"></datalist>
      </div>

      <div class="feedback-form__field" data-verdict="${VERDICT.UNLISTED_ANIMAL}" hidden>
        <label class="field__label" for="${id}-unlisted">What animal is it?</label>
        <input id="${id}-unlisted" maxlength="${MAX_ANIMAL_LENGTH}" autocomplete="off" data-part="unlistedAnimal" />
      </div>

      <div class="feedback-form__field">
        <label class="field__label" for="${id}-comment">
          Comment <span class="feedback-form__optional">(optional)</span>
        </label>
        <textarea id="${id}-comment" rows="2" maxlength="${MAX_COMMENT_LENGTH}" data-part="commentField"></textarea>
      </div>

      <label class="feedback-form__consent">
        <input type="checkbox" data-part="allowsTraining" />
        <span>
          Let this image be used to train the model. An administrator checks it
          first, and you can withdraw it at any time.
        </span>
      </label>

      <div class="feedback-form__actions">
        <button type="button" class="btn-ghost" data-part="cancel">Cancel</button>
        <button type="submit" class="btn" data-part="submit">Send feedback</button>
      </div>
    </form>

    <p class="message" hidden></p>
  `;

  const part = (name) => panel.querySelector(`[data-part="${name}"]`);
  const form = panel.querySelector(".feedback-form");

  return {
    panel,
    question: panel.querySelector(".feedback-panel__question"),
    answer: panel.querySelector(".feedback-panel__answer"),
    form,
    message: panel.querySelector(".message"),
    yes: part("yes"),
    no: part("no"),
    verdict: part("verdict"),
    training: part("training"),
    comment: part("comment"),
    change: part("change"),
    withdraw: part("withdraw"),
    verdicts: form.querySelectorAll('input[type="radio"]'),
    verdictFields: form.querySelectorAll("[data-verdict]"),
    knownAnimal: part("knownAnimal"),
    animalList: part("animalList"),
    unlistedAnimal: part("unlistedAnimal"),
    commentField: part("commentField"),
    allowsTraining: part("allowsTraining"),
    cancel: part("cancel"),
    submit: part("submit"),
  };
}

/* -------------------------------------------------------------------------
   The question and the answer
   ------------------------------------------------------------------------- */

// The question, the answer and the form are alternatives, so one of them is on
// screen at a time.
function showView(parts, view) {
  parts.question.hidden = view !== parts.question;
  parts.answer.hidden = view !== parts.answer;
  parts.form.hidden = view !== parts.form;
}

/**
 * Shows the question, or the answer once there is one, in place of the form
 * and anything it said.
 *
 * @param focus whether to move the focus into it, for when the view the user
 *   was in has just gone.
 */
function showCurrent(parts, state, { focus = false } = {}) {
  const { feedback } = state;
  hideMessage(parts.message);

  if (feedback) {
    parts.verdict.textContent = describeVerdict(feedback);
    parts.training.textContent = describeTraining(feedback);
    parts.comment.textContent = feedback.comment ?? "";
    parts.comment.hidden = !feedback.comment;
  }

  const view = feedback ? parts.answer : parts.question;
  showView(parts, view);

  if (focus) {
    (feedback ? parts.change : parts.yes).focus();
  }
}

async function withdraw(parts, state) {
  const note = state.feedback.allowsTraining ? WITHDRAW_NOTE : "";
  if (!(await askToConfirm(WITHDRAW_QUESTION, note))) {
    return;
  }

  try {
    await withdrawFeedback(state.recognitionId);
  } catch (error) {
    console.error("Could not withdraw the feedback:", error);
    showError(parts.message, error.message);
    return;
  }

  state.feedback = null;
  state.onChange(null);
  showCurrent(parts, state, { focus: true });
}

/* -------------------------------------------------------------------------
   The form
   ------------------------------------------------------------------------- */

function openForm(parts, state, verdict) {
  fillForm(parts, state.feedback, verdict);
  hideMessage(parts.message);
  showView(parts, parts.form);
  offerKnownAnimals(parts);

  parts.form.querySelector('input[type="radio"]:checked').focus();
}

// Starts from what the user said before, if anything, so that changing it is
// a matter of changing what differs.
function fillForm(parts, feedback, verdict) {
  parts.form.reset();

  for (const choice of parts.verdicts) {
    choice.checked = choice.value === verdict;
  }

  if (feedback) {
    const field = feedback.verdict === VERDICT.WRONG_ANIMAL ? parts.knownAnimal : parts.unlistedAnimal;
    field.value = feedback.actualAnimal ?? "";
    parts.commentField.value = feedback.comment ?? "";
    parts.allowsTraining.checked = feedback.allowsTraining;
  }

  showVerdictFields(parts);
}

// Each verdict that names an animal has a field of its own, which is asked for
// only while that verdict is chosen.
function showVerdictFields(parts) {
  const verdict = selectedVerdict(parts);

  for (const field of parts.verdictFields) {
    const shown = field.dataset.verdict === verdict;
    field.hidden = !shown;
    field.querySelector("input").required = shown;
  }
}

function offerKnownAnimals(parts) {
  knownAnimals ??= getKnownAnimals().catch((error) => {
    knownAnimals = null;
    throw error;
  });

  knownAnimals
    .then((animals) => {
      parts.animalList.replaceChildren(...animals.map((animal) => new Option(animal)));
    })
    .catch((error) => {
      // The field still takes what is typed, and the backend says whether it
      // knows the animal.
      console.error("Could not load the animals the model knows:", error);
    });
}

async function submit(parts, state) {
  const feedback = await readForm(parts);
  if (!feedback) {
    showError(parts.message, UNKNOWN_ANIMAL);
    parts.knownAnimal.focus();
    return;
  }

  parts.submit.disabled = true;

  try {
    state.feedback = await giveFeedback(state.recognitionId, feedback);
  } catch (error) {
    console.error("Could not send the feedback:", error);
    showError(parts.message, error.message);
    return;
  } finally {
    parts.submit.disabled = false;
  }

  state.onChange(state.feedback);
  showCurrent(parts, state, { focus: true });
}

/**
 * @returns what the form says, as the backend takes it, or null when it names
 *   another animal the model does not know.
 */
async function readForm(parts) {
  const verdict = selectedVerdict(parts);
  const feedback = {
    verdict,
    actualAnimal: null,
    comment: parts.commentField.value,
    allowsTraining: parts.allowsTraining.checked,
  };

  if (verdict === VERDICT.UNLISTED_ANIMAL) {
    feedback.actualAnimal = parts.unlistedAnimal.value;
  } else if (verdict === VERDICT.WRONG_ANIMAL) {
    feedback.actualAnimal = await knownAnimalFor(parts.knownAnimal.value);
  }

  return verdict === VERDICT.WRONG_ANIMAL && !feedback.actualAnimal ? null : feedback;
}

// Without the list, what was typed is sent as it is, and the backend says
// whether it knows the animal.
async function knownAnimalFor(typed) {
  let animals = null;

  try {
    animals = await knownAnimals;
  } catch {
    // Reported when the list was asked for.
  }

  return animals ? findKnownAnimal(animals, typed) : typed;
}

function selectedVerdict(parts) {
  return [...parts.verdicts].find((choice) => choice.checked)?.value;
}
