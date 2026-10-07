// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderPager } from "./pager.js";

describe("renderPager", () => {
  it("disables Previous on the first page and Next on the last", () => {
    const first = render({ page: 1, pageSize: 20, totalCount: 41 });
    expect(first.previous.disabled).toBe(true);
    expect(first.next.disabled).toBe(false);

    const last = render({ page: 3, pageSize: 20, totalCount: 41 });
    expect(last.previous.disabled).toBe(false);
    expect(last.next.disabled).toBe(true);
    expect(last.label.textContent).toBe("Page 3 of 3");
  });

  // A second click would otherwise ask for the same page again, or race the
  // first for another.
  it("asks for one page at a time while one loads", async () => {
    let finishLoading;
    const onPage = vi.fn(() => new Promise((resolve) => (finishLoading = resolve)));
    const { previous, next } = render({ page: 2, pageSize: 20, totalCount: 41 }, onPage);

    next.click();
    next.click();
    previous.click();

    expect(onPage).toHaveBeenCalledOnce();
    expect(onPage).toHaveBeenCalledWith(3);
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(true);

    finishLoading();
    await vi.waitFor(() => expect(next.disabled).toBe(false));
  });

  // The page shows why it failed and leaves the pager as it was, so its
  // buttons have to work again.
  it("lets a page that failed to load be asked for again", async () => {
    const onPage = vi.fn(async () => {});
    const { previous, next } = render({ page: 1, pageSize: 20, totalCount: 41 }, onPage);

    next.click();
    await vi.waitFor(() => expect(next.disabled).toBe(false));
    next.click();

    expect(onPage).toHaveBeenCalledTimes(2);
    expect(previous.disabled).toBe(true);
  });
});

function render(result, onPage = () => {}) {
  const pager = document.createElement("div");
  renderPager(pager, result, onPage);

  const [previous, label, next] = pager.children;
  return { previous, label, next };
}
