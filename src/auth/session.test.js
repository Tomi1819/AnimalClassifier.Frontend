// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { clearSession, getToken, getUserEmail, isAdmin, setSession } from "./session.js";

const SECONDS_PER_HOUR = 3600;

// The long form is the one the backend writes; see EMAIL_CLAIMS.
const EMAIL_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";

afterEach(() => clearSession());

describe("getToken", () => {
  it("hands out a token that has not expired", () => {
    const token = createToken({ exp: nowInSeconds() + SECONDS_PER_HOUR });
    setSession(token, []);

    expect(getToken()).toBe(token);
  });

  // A token outlives the browser being closed, so its own expiry is what ends it.
  it("forgets a token that has expired", () => {
    setSession(createToken({ exp: nowInSeconds() - 1 }), ["Admin"]);

    expect(getToken()).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it("leaves a token without an expiry for the backend to judge", () => {
    const token = createToken({});
    setSession(token, []);

    expect(getToken()).toBe(token);
  });
});

describe("getUserEmail", () => {
  it("reads the email from the claim the backend writes", () => {
    setSession(createToken({ [EMAIL_CLAIM]: "user@example.test" }), []);

    expect(getUserEmail()).toBe("user@example.test");
  });

  // The payload is UTF-8, which atob alone would read as Latin-1.
  it("reads an email that is not ASCII", () => {
    setSession(createToken({ email: "zoë@example.test" }), []);

    expect(getUserEmail()).toBe("zoë@example.test");
  });

  it("is null when no one is signed in", () => {
    expect(getUserEmail()).toBeNull();
  });
});

describe("isAdmin", () => {
  it("is true for a session with the Admin role", () => {
    setSession(createToken({}), ["User", "Admin"]);

    expect(isAdmin()).toBe(true);
  });

  it("is false once the session has ended", () => {
    setSession(createToken({ exp: nowInSeconds() - 1 }), ["Admin"]);

    expect(isAdmin()).toBe(false);
  });
});

// Unsigned, which the frontend never checks; only the backend can.
function createToken(claims) {
  const encode = (value) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  return `${encode({ alg: "none" })}.${encode(claims)}.`;
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}
