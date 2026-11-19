import { describe, expect, it } from "bun:test";
import { isValidScreenshot, SCREENSHOT_MIME_TYPES } from "./screenshot-rules";

const TEN_MB = 10 * 1024 * 1024;

describe("screenshot rules", () => {
  it.each(SCREENSHOT_MIME_TYPES)("accepts %s within the size limit", (mimeType) => {
    expect(isValidScreenshot(mimeType, TEN_MB, TEN_MB)).toBe(true);
  });

  it.each(["image/gif", "image/svg+xml", "text/html", "application/pdf"])("rejects %s", (mimeType) => {
    expect(isValidScreenshot(mimeType, 1024, TEN_MB)).toBe(false);
  });

  it("rejects empty files and files over the limit", () => {
    expect(isValidScreenshot("image/png", 0, TEN_MB)).toBe(false);
    expect(isValidScreenshot("image/png", TEN_MB + 1, TEN_MB)).toBe(false);
  });
});
