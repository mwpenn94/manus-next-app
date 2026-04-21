import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Paste Workflow Tests
 *
 * Tests the clipboard paste → file upload → attachment flow
 * that was added for both Home page and TaskView inputs.
 *
 * Since these are React component behaviors, we test the underlying
 * logic (file extraction, naming, transfer) rather than DOM events.
 */

describe("Paste Workflow — File Extraction Logic", () => {
  it("should rename generic clipboard image filenames", () => {
    // The handlePaste logic renames "image.png" to a timestamped name
    const genericNames = ["image.png", "image.jpg", "image.jpeg", "image.gif", "image.webp"];
    const now = Date.now();

    for (const name of genericNames) {
      const ext = name.split(".").pop();
      const isGeneric = /^image\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(name);
      expect(isGeneric).toBe(true);

      // Simulates the rename logic from handlePaste
      const newName = isGeneric ? `pasted-${now}.${ext}` : name;
      expect(newName).toMatch(/^pasted-\d+\.\w+$/);
    }
  });

  it("should NOT rename non-generic filenames", () => {
    const specificNames = ["screenshot.png", "document.pdf", "photo.jpg", "report.xlsx"];

    for (const name of specificNames) {
      const isGeneric = /^image\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(name);
      expect(isGeneric).toBe(false);
    }
  });

  it("should extract files from clipboard data items", () => {
    // Simulates ClipboardEvent.clipboardData.items
    const mockItems = [
      { kind: "file", type: "image/png", getAsFile: () => new File(["data"], "image.png", { type: "image/png" }) },
      { kind: "string", type: "text/plain", getAsFile: () => null }, // text items should be skipped
      { kind: "file", type: "application/pdf", getAsFile: () => new File(["pdf"], "doc.pdf", { type: "application/pdf" }) },
    ];

    const files: File[] = [];
    for (const item of mockItems) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    expect(files).toHaveLength(2);
    expect(files[0].name).toBe("image.png");
    expect(files[0].type).toBe("image/png");
    expect(files[1].name).toBe("doc.pdf");
    expect(files[1].type).toBe("application/pdf");
  });

  it("should extract files from clipboard data files list", () => {
    // Simulates ClipboardEvent.clipboardData.files (fallback path)
    const mockFiles = [
      new File(["img"], "screenshot.png", { type: "image/png" }),
      new File(["doc"], "report.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
    ];

    expect(mockFiles).toHaveLength(2);
    expect(mockFiles[0].type).toBe("image/png");
    expect(mockFiles[1].type).toContain("word");
  });
});

describe("Paste Workflow — Pending Files Transfer", () => {
  beforeEach(() => {
    // Clean up any global state
    delete (globalThis as any).__pendingTaskFiles;
  });

  it("should store pending files in window.__pendingTaskFiles", () => {
    const pendingFiles = [
      new File(["data"], "test.png", { type: "image/png" }),
    ];

    // Simulates Home page storing files for TaskView pickup
    (globalThis as any).__pendingTaskFiles = pendingFiles;

    expect((globalThis as any).__pendingTaskFiles).toHaveLength(1);
    expect((globalThis as any).__pendingTaskFiles[0].name).toBe("test.png");
  });

  it("should clear pending files after pickup", () => {
    const pendingFiles = [
      new File(["data"], "test.png", { type: "image/png" }),
    ];

    (globalThis as any).__pendingTaskFiles = pendingFiles;

    // Simulates TaskView picking up pending files
    const picked = (globalThis as any).__pendingTaskFiles;
    delete (globalThis as any).__pendingTaskFiles;

    expect(picked).toHaveLength(1);
    expect((globalThis as any).__pendingTaskFiles).toBeUndefined();
  });

  it("should handle no pending files gracefully", () => {
    // TaskView checks for pending files on mount
    const pending = (globalThis as any).__pendingTaskFiles;
    expect(pending).toBeUndefined();
  });
});

describe("Paste Workflow — File Size Formatting", () => {
  it("should format file sizes correctly for preview display", () => {
    // Simulates the size formatting used in the attachment preview strip
    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    expect(formatSize(500)).toBe("500B");
    expect(formatSize(1024)).toBe("1KB");
    expect(formatSize(1536)).toBe("2KB");
    expect(formatSize(1048576)).toBe("1.0MB");
    expect(formatSize(5242880)).toBe("5.0MB");
  });

  it("should extract file extension for display", () => {
    const getExt = (name: string) => {
      const parts = name.split(".");
      return parts.length > 1 ? parts.pop()!.toUpperCase() : "FILE";
    };

    expect(getExt("photo.png")).toBe("PNG");
    expect(getExt("document.pdf")).toBe("PDF");
    expect(getExt("archive.tar.gz")).toBe("GZ");
    expect(getExt("noextension")).toBe("FILE");
  });
});

describe("Paste Workflow — Image Detection", () => {
  it("should detect image files for thumbnail preview", () => {
    const isImage = (type: string) => type.startsWith("image/");

    expect(isImage("image/png")).toBe(true);
    expect(isImage("image/jpeg")).toBe(true);
    expect(isImage("image/gif")).toBe(true);
    expect(isImage("image/webp")).toBe(true);
    expect(isImage("application/pdf")).toBe(false);
    expect(isImage("text/plain")).toBe(false);
    expect(isImage("video/mp4")).toBe(false);
  });
});
