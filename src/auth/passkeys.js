import { apiFetch } from "../api/client.js";

const CREATION_OPTIONS_PATH = "/api/passkey/options";
const PASSKEY_PATH = "/api/passkey";
const SIGN_IN_OPTIONS_PATH = "/api/auth/passkey/options";
const SIGN_IN_PATH = "/api/auth/passkey/login";

const UNSUPPORTED_MESSAGE = "This browser cannot use passkeys.";
const CANCELLED_MESSAGE = "No passkey was used. Please try again.";
const ALREADY_REGISTERED_MESSAGE = "This device already has a passkey for your account.";
const UNEXPECTED_MESSAGE = "The passkey could not be used. Please try again.";

/**
 * Thrown when the browser or the authenticator, rather than the backend, is
 * what stopped a ceremony. The message is meant for the user, so pages report
 * it the same way they report an ApiError.
 */
export class PasskeyError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "PasskeyError";
  }
}

/**
 * Whether this browser can take part at all.
 *
 * The check covers the JSON helpers rather than WebAuthn itself, because they
 * are what spares this module from converting every field to and from the
 * binary form by hand. A browser with one and not the other is old enough that
 * the pages are better off simply not offering passkeys.
 */
export function isPasskeySupported() {
  return typeof window.PublicKeyCredential === "function"
    && typeof PublicKeyCredential.parseCreationOptionsFromJSON === "function"
    && typeof PublicKeyCredential.parseRequestOptionsFromJSON === "function";
}

/**
 * Registers a new passkey against the signed-in account.
 *
 * @returns the passkey as the account now lists it.
 */
export async function registerPasskey(name) {
  const { options, state } = await apiFetch(CREATION_OPTIONS_PATH, { method: "POST" });

  const credential = await perform(() =>
    navigator.credentials.create({
      publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
    }),
  );

  return apiFetch(PASSKEY_PATH, {
    method: "POST",
    body: JSON.stringify({ credential, state, name }),
  });
}

/**
 * Signs in with whichever passkey the user picks. Nothing is sent to identify
 * them first: the browser knows which passkeys it holds for this site, so it
 * is the one that asks.
 *
 * @returns the session, in the same shape a password sign-in returns.
 */
export async function signInWithPasskey() {
  const { options, state } = await apiFetch(SIGN_IN_OPTIONS_PATH, { method: "POST" });

  const credential = await perform(() =>
    navigator.credentials.get({
      publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
    }),
  );

  return apiFetch(SIGN_IN_PATH, {
    method: "POST",
    body: JSON.stringify({ credential, state }),
  });
}

export function listPasskeys() {
  return apiFetch(PASSKEY_PATH);
}

export function removePasskey(id) {
  return apiFetch(`${PASSKEY_PATH}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * Runs the authenticator half of a ceremony and hands back what it produced,
 * in the JSON form the backend reads.
 */
async function perform(ceremony) {
  if (!isPasskeySupported()) {
    throw new PasskeyError(UNSUPPORTED_MESSAGE);
  }

  let credential;

  try {
    credential = await ceremony();
  } catch (error) {
    throw new PasskeyError(describe(error), error);
  }

  // Only some browsers reject; the rest resolve with nothing to show for it.
  if (credential === null) {
    throw new PasskeyError(CANCELLED_MESSAGE);
  }

  return credential.toJSON();
}

// A cancelled prompt and one that timed out arrive as the same error, and the
// user did not distinguish them either: both mean nothing was chosen.
function describe(error) {
  switch (error?.name) {
    case "NotAllowedError":
      return CANCELLED_MESSAGE;
    case "InvalidStateError":
      return ALREADY_REGISTERED_MESSAGE;
    default:
      return UNEXPECTED_MESSAGE;
  }
}
