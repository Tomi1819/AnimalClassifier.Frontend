import { resolveUrl } from "../api/client.js";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MEGABYTES,
  uploadImage,
  uploadVideo,
} from "../api/recognitions.js";
import { hideMessage, showError, showProgress, showSuccess } from "../shared/feedback.js";
import { formatFileSize } from "../shared/format.js";

const TOO_LARGE_MESSAGE = `That file is larger than ${MAX_UPLOAD_MEGABYTES} MB.`;

// The two tabs are the same widget pointed at a different endpoint, so they
// differ only by the ids they own and the wording they use.
const IMAGE_UPLOAD = {
  tab: "imageTabBtn",
  panel: "imageUploadTab",
  dropzone: "imageDropzone",
  input: "imageFileUpload",
  form: "imageUploadForm",
  button: "imageUploadButton",
  summary: "imageFileSummary",
  fileName: "imageFileName",
  fileSize: "imageFileSize",
  thumbnail: "imageThumb",
  upload: uploadImage,
  missingFile: "Please select an image file.",
  wrongType: "That file is not a JPG or PNG image.",
  progress: "Uploading image...",
  success: "Image upload successful!",
  toRecognition: toImageRecognition,
};

const VIDEO_UPLOAD = {
  tab: "videoTabBtn",
  panel: "videoUploadTab",
  dropzone: "videoDropzone",
  input: "videoFileUpload",
  form: "videoUploadForm",
  button: "videoUploadButton",
  summary: "videoFileSummary",
  fileName: "videoFileName",
  fileSize: "videoFileSize",
  upload: uploadVideo,
  missingFile: "Please select a video file.",
  wrongType: "That file is not an MP4, MOV or AVI video.",
  progress: "Uploading video...",
  success: "Video upload successful!",
  toRecognition: toVideoRecognition,
};

/**
 * The image and video tabs at the top of the dashboard, each a dropzone and a
 * button that uploads what was chosen.
 *
 * @param status the message element that reports on an upload.
 * @param onRecognised called with each upload's recognition once the backend
 *   has made it, in the shape the result card and the history render.
 */
export function initUploadForms({ status, onRecognised }) {
  const tabs = [IMAGE_UPLOAD, VIDEO_UPLOAD].map((config) => initUpload(config, status, onRecognised));
  initTabs(tabs);
}

/* -------------------------------------------------------------------------
   Tabs
   ------------------------------------------------------------------------- */

// A pressed button is how a group of toggles announces which one is on, where
// the class alone says so only to the eye.
function initTabs(tabs) {
  tabs.forEach((tab) => {
    tab.button.addEventListener("click", () => {
      tabs.forEach((other) => {
        const isSelected = other === tab;
        other.button.classList.toggle("is-active", isSelected);
        other.button.setAttribute("aria-pressed", String(isSelected));
        other.panel.hidden = !isSelected;
      });
    });
  });
}

/* -------------------------------------------------------------------------
   Upload
   ------------------------------------------------------------------------- */

function initUpload(config, status, onRecognised) {
  const elements = {
    dropzone: document.getElementById(config.dropzone),
    input: document.getElementById(config.input),
    form: document.getElementById(config.form),
    button: document.getElementById(config.button),
    summary: document.getElementById(config.summary),
    fileName: document.getElementById(config.fileName),
    fileSize: document.getElementById(config.fileSize),
    thumbnail: config.thumbnail ? document.getElementById(config.thumbnail) : null,
  };

  initDropzone(config, elements, status);
  initSubmit(config, elements, status, onRecognised);

  return {
    button: document.getElementById(config.tab),
    panel: document.getElementById(config.panel),
  };
}

function initDropzone(config, elements, status) {
  const { dropzone, input } = elements;

  input.addEventListener("change", () => {
    const [file] = input.files;
    showSelectedFile(elements, file);

    // Said as soon as the file is chosen, rather than once the user has
    // pressed upload.
    const problem = file && findProblem(config, file, input.accept);
    if (problem) {
      showError(status, problem);
    } else {
      hideMessage(status);
    }
  });

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });

  // `dragleave` also fires when the pointer crosses onto a child element, so
  // the highlight is only dropped once the pointer has left the dropzone.
  dropzone.addEventListener("dragleave", (event) => {
    if (!dropzone.contains(event.relatedTarget)) {
      dropzone.classList.remove("is-dragging");
    }
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");

    const [file] = event.dataTransfer.files;
    if (!file) {
      return;
    }

    const problem = findProblem(config, file, input.accept);
    if (problem) {
      showError(status, problem);
      return;
    }

    // A dropped file has to be handed to the input, which is what the form
    // reads from; assigning `files` does not raise a change event.
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    showSelectedFile(elements, file);
  });
}

// Checked here as well as by the backend, so that a file it would refuse is
// never sent: a large video takes a while to upload only to be turned away.
function findProblem(config, file, accept) {
  if (!isAccepted(file, accept)) {
    return config.wrongType;
  }

  return file.size > MAX_UPLOAD_BYTES ? TOO_LARGE_MESSAGE : null;
}

// Windows reports no type at all for some AVI files; the backend validates
// the upload regardless, so only a positively wrong type is refused here.
function isAccepted(file, accept) {
  const types = accept.split(",").map((type) => type.trim());
  return !file.type || types.includes(file.type);
}

function showSelectedFile({ dropzone, summary, fileName, fileSize, thumbnail }, file) {
  if (!file) {
    dropzone.classList.remove("has-file");
    summary.hidden = true;
    return;
  }

  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);

  if (thumbnail) {
    // The previous preview is released before its URL is replaced, so choosing
    // several files in a row does not retain every one of them.
    URL.revokeObjectURL(thumbnail.src);
    thumbnail.src = URL.createObjectURL(file);
  }

  dropzone.classList.add("has-file");
  summary.hidden = false;
}

function initSubmit(config, elements, status, onRecognised) {
  const { form, input, button } = elements;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = input.files[0];
    if (!file) {
      showError(status, config.missingFile);
      return;
    }

    const problem = findProblem(config, file, input.accept);
    if (problem) {
      showError(status, problem);
      return;
    }

    showProgress(status, config.progress);
    button.disabled = true;

    try {
      const result = await config.upload(file);
      onRecognised(config.toRecognition(result));
      showSuccess(status, config.success);
    } catch (error) {
      console.error("The upload failed:", error);
      // The error explains itself, so an offline backend is not reported as a
      // problem with the file the user chose.
      showError(status, error.message);
    } finally {
      button.disabled = false;
    }
  });
}

/* -------------------------------------------------------------------------
   Recognitions

   An upload's answer, in the shape a stored history entry is read into, so
   the page renders both the same way.
   ------------------------------------------------------------------------- */

function toImageRecognition(result) {
  return {
    id: result.imageId,
    type: "image",
    url: resolveUrl(result.imagePath),
    animal: result.recognizedAnimal,
    date: result.dateRecognized,
    score: result.predictionScore,
    feedback: null,
  };
}

function toVideoRecognition(result) {
  return {
    type: "video",
    url: resolveUrl(result.videoPath),
    // A video has no single prediction, so its strongest match stands in for
    // one in the history list.
    animal: result.topAnimals[0]?.animal ?? "Unknown",
    date: new Date().toISOString(),
    framesProcessed: result.framesProcessed,
    topAnimals: result.topAnimals,
  };
}
