// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, NetworkError } from "./client.js";

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("answers with the parsed body", async () => {
    respondWith(new Response(JSON.stringify({ total: 3 }), { status: 200 }));

    expect(await apiFetch("/api/statistics/total")).toEqual({ total: 3 });
  });

  it("answers a response without a body with null", async () => {
    respondWith(new Response(null, { status: 204 }));

    expect(await apiFetch("/api/upload/history", { method: "DELETE" })).toBeNull();
  });

  it("throws the backend's message for a failure", async () => {
    respondWith(new Response(JSON.stringify({ message: "Only JPEG and PNG images can be uploaded." }), { status: 400 }));

    const error = await apiFetch("/api/upload/image").catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Only JPEG and PNG images can be uploaded.");
    expect(error.status).toBe(400);
  });

  it("throws a failure's text as it comes when it is not the backend's", async () => {
    respondWith(new Response("Forbidden", { status: 403 }));

    await expect(apiFetch("/api/admin/users")).rejects.toThrow("Forbidden");
  });

  // The proxy answers this way when the backend is not running.
  it("reports a gateway error as an unreachable server", async () => {
    respondWith(new Response(null, { status: 502 }));

    await expect(apiFetch("/api/statistics/total")).rejects.toBeInstanceOf(NetworkError);
  });

  it("reports a request that never reached the server as an unreachable one", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(apiFetch("/api/statistics/total")).rejects.toBeInstanceOf(NetworkError);
  });

  // The page called it off, so blaming the server would be wrong.
  it("passes on a request the page called off as called off", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((_, { signal }) => {
      controller.abort();
      return Promise.reject(signal.reason);
    }));

    const error = await apiFetch("/api/animal/search?searchTerm=cat", { signal: controller.signal })
      .catch((caught) => caught);

    expect(error).not.toBeInstanceOf(NetworkError);
    expect(error.name).toBe("AbortError");
  });
});

function respondWith(response) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}
