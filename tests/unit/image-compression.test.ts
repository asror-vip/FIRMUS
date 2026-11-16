import { describe, it, expect } from "vitest";
import {
  AI_IMAGE_FORMAT_ERROR,
  inspectClipboardPaste,
  isSupportedAiImageFile,
  resolveSupportedImageMime,
} from "../../lib/utils/image-compression";

describe("AI Chat Image Validation & Clipboard Inspection", () => {
  it("accepts JPG, PNG, and WEBP images and rejects non-image files", () => {
    expect(resolveSupportedImageMime({ type: "image/jpeg", name: "chek.jpg" })).toBe("image/jpeg");
    expect(resolveSupportedImageMime({ type: "image/png", name: "skrinshot.png" })).toBe("image/png");
    expect(resolveSupportedImageMime({ type: "image/webp", name: "faktura.webp" })).toBe("image/webp");
    expect(resolveSupportedImageMime({ type: "", name: "camera_photo.JPEG" })).toBe("image/jpeg");

    expect(isSupportedAiImageFile({ type: "application/pdf", name: "faktura.pdf" })).toBe(false);
    expect(isSupportedAiImageFile({ type: "text/csv", name: "bank.csv" })).toBe(false);
    expect(
      isSupportedAiImageFile({
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        name: "1c.xlsx",
      })
    ).toBe(false);
    expect(isSupportedAiImageFile({ type: "image/heic", name: "iphone.heic" })).toBe(false);
  });

  it("distinguishes text paste, valid image paste, and rejected file paste", () => {
    const fakePng = { type: "image/png", name: "image.png" } as File;
    const fakePdf = { type: "application/pdf", name: "shartnoma.pdf" } as File;

    expect(
      inspectClipboardPaste({
        items: [{ kind: "string", getAsFile: () => null }],
        files: [],
      } as unknown as DataTransfer)
    ).toEqual({ kind: "text" });

    expect(
      inspectClipboardPaste({
        items: [{ kind: "file", getAsFile: () => fakePng }],
        files: [fakePng],
      } as unknown as DataTransfer)
    ).toEqual({ kind: "image", file: fakePng });

    expect(
      inspectClipboardPaste({
        items: [{ kind: "file", getAsFile: () => fakePdf }],
        files: [fakePdf],
      } as unknown as DataTransfer)
    ).toEqual({ kind: "invalid_file", fileName: "shartnoma.pdf" });

    expect(AI_IMAGE_FORMAT_ERROR).toContain("Rasm formati toʻgʻri emas");
  });
});
