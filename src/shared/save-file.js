// Long enough for any browser to have started the download. Releasing the file
// straight after the click cancels it in some of them.
const RELEASE_DELAY_MS = 60_000;

/**
 * Hands a file the page holds to the browser to save, the way a link marked
 * `download` would. Where it goes is up to the browser and the user's
 * settings.
 */
export function saveFile(blob, fileName) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), RELEASE_DELAY_MS);
}
