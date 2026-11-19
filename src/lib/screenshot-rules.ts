export const SCREENSHOT_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function isValidScreenshot(mimeType: string, size: number, maxBytes: number): boolean {
  return SCREENSHOT_MIME_TYPES.includes(mimeType as (typeof SCREENSHOT_MIME_TYPES)[number])
    && size > 0
    && size <= maxBytes;
}
