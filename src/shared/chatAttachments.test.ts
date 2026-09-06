import { describe, it, expect } from "vitest";
import {
  collectDataTransferFiles,
  dataTransferHasFiles,
  guessAttachmentFileName,
  isSupportedAttachmentName,
} from "./chatAttachments";

describe("guessAttachmentFileName", () => {
  it("keeps a real filename", () => {
    expect(guessAttachmentFileName({ name: "shot.png", type: "image/png" })).toBe(
      "shot.png",
    );
  });

  it("keeps Chromium clipboard image names", () => {
    expect(
      guessAttachmentFileName({ name: "image.png", type: "image/png" }),
    ).toBe("image.png");
  });

  it("names unnamed clipboard images", () => {
    expect(guessAttachmentFileName({ name: "", type: "image/png" })).toBe(
      "pasted-image.png",
    );
    expect(guessAttachmentFileName({ name: "blob", type: "image/jpeg" })).toBe(
      "pasted-image.jpg",
    );
  });

  it("adds an extension from mime when the name has none", () => {
    expect(guessAttachmentFileName({ name: "notes", type: "text/plain" })).toBe(
      "notes.txt",
    );
  });
});

describe("isSupportedAttachmentName", () => {
  it("accepts guessed clipboard image names", () => {
    expect(isSupportedAttachmentName("pasted-image.png")).toBe(true);
  });
});

describe("collectDataTransferFiles", () => {
  it("dedupes files listed in both files and items", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", {
      type: "image/png",
      lastModified: 1,
    });
    const dt = {
      files: [file] as unknown as FileList,
      items: [
        {
          kind: "file",
          getAsFile: () => file,
        },
      ],
    };
    expect(collectDataTransferFiles(dt as unknown as DataTransfer)).toEqual([
      file,
    ]);
  });
});

describe("dataTransferHasFiles", () => {
  it("detects the Files type", () => {
    expect(dataTransferHasFiles(["text/plain", "Files"])).toBe(true);
    expect(dataTransferHasFiles(["text/plain"])).toBe(false);
  });
});
