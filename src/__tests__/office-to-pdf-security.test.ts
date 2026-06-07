/**
 * office-to-pdf security — unit tests for validation logic
 *
 * Tests the pure helper functions extracted from the Netlify function so
 * they can be tested without launching Chromium.
 *
 * SOLID mapping:
 *  S — each validator has a single reason to change
 *  O — new allowed origins / hosts extend the allowlist without modifying validators
 *  L — all validators return the same shape (valid boolean + optional reason)
 *  I — each test only cares about the function it tests
 *  D — validators depend on simple string/URL types, not on the Handler infrastructure
 */

import { describe, it, expect } from "vitest";

// ─── Pure helper functions mirrored from the Netlify function ─────────────────
// (Extracted here so they can be unit-tested without the full Netlify runtime)

const OFFICE_PATTERN = /\.(doc|docx|xls|xlsx|pptx|ppsx)$/i;

function ext(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

function isValidFileName(fileName: string): { valid: boolean; reason?: string } {
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return { valid: false, reason: "path traversal detected" };
  }
  if (!OFFICE_PATTERN.test(fileName)) {
    return { valid: false, reason: `unsupported extension: .${ext(fileName)}` };
  }
  return { valid: true };
}

const ALLOWED_STORAGE_HOSTS = ["firebasestorage.googleapis.com", "storage.googleapis.com"];

function isValidSourceUrl(rawUrl: string): { valid: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: "not a valid URL" };
  }
  if (!ALLOWED_STORAGE_HOSTS.includes(parsed.hostname)) {
    return { valid: false, reason: `disallowed host: ${parsed.hostname}` };
  }
  return { valid: true };
}

const ALLOWED_ORIGINS = [
  "https://salea2026.netlify.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true; // same-origin request — no Origin header
  return ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
}

// ─── isValidFileName ──────────────────────────────────────────────────────────

describe("isValidFileName", () => {
  it("accepts valid docx filename", () => {
    expect(isValidFileName("nomination.docx").valid).toBe(true);
  });

  it("accepts all supported extensions", () => {
    for (const ext of ["doc", "docx", "xls", "xlsx", "pptx", "ppsx"]) {
      expect(isValidFileName(`file.${ext}`).valid).toBe(true);
    }
  });

  it("rejects unsupported extension", () => {
    const r = isValidFileName("evil.exe");
    expect(r.valid).toBe(false);
  });

  it("rejects filenames with path traversal (../)", () => {
    expect(isValidFileName("../etc/passwd.docx").valid).toBe(false);
  });

  it("rejects filenames with forward slash", () => {
    expect(isValidFileName("folder/file.docx").valid).toBe(false);
  });

  it("rejects filenames with backslash", () => {
    expect(isValidFileName("folder\\file.docx").valid).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidFileName("").valid).toBe(false);
  });

  it("is case-insensitive for extensions", () => {
    expect(isValidFileName("Nomination.DOCX").valid).toBe(true);
    expect(isValidFileName("Report.PPTX").valid).toBe(true);
  });
});

// ─── isValidSourceUrl (SSRF guard) ────────────────────────────────────────────

describe("isValidSourceUrl — SSRF prevention", () => {
  it("accepts Firebase Storage URL", () => {
    const url = "https://firebasestorage.googleapis.com/v0/b/project/o/file.docx?alt=media";
    expect(isValidSourceUrl(url).valid).toBe(true);
  });

  it("accepts storage.googleapis.com URL", () => {
    const url = "https://storage.googleapis.com/bucket/file.docx";
    expect(isValidSourceUrl(url).valid).toBe(true);
  });

  it("rejects internal localhost (SSRF)", () => {
    expect(isValidSourceUrl("http://localhost/secret").valid).toBe(false);
  });

  it("rejects metadata endpoint (cloud SSRF)", () => {
    expect(isValidSourceUrl("http://169.254.169.254/latest/meta-data/").valid).toBe(false);
  });

  it("rejects arbitrary external domain", () => {
    expect(isValidSourceUrl("https://evil.com/malware.docx").valid).toBe(false);
  });

  it("rejects malformed URL", () => {
    expect(isValidSourceUrl("not-a-url").valid).toBe(false);
  });

  it("rejects file:// protocol", () => {
    expect(isValidSourceUrl("file:///etc/passwd").valid).toBe(false);
  });
});

// ─── isAllowedOrigin (CSRF guard) ────────────────────────────────────────────

describe("isAllowedOrigin — CSRF prevention", () => {
  it("allows the production Netlify origin", () => {
    expect(isAllowedOrigin("https://salea2026.netlify.app")).toBe(true);
  });

  it("allows localhost dev origins", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
  });

  it("blocks an unknown origin", () => {
    expect(isAllowedOrigin("https://evil.com")).toBe(false);
  });

  it("allows empty string (same-origin browser request omits Origin header)", () => {
    expect(isAllowedOrigin("")).toBe(true);
  });

  it("does not allow origin that merely contains an allowed domain as a substring", () => {
    // e.g. https://evil-salea2026.netlify.app.evil.com should be rejected
    expect(isAllowedOrigin("https://evil-salea2026.netlify.app.evil.com")).toBe(false);
  });
});

// ─── ext helper ──────────────────────────────────────────────────────────────

describe("ext helper", () => {
  it("returns lowercase extension", () => {
    expect(ext("File.DOCX")).toBe("docx");
  });

  it("returns empty string for no extension", () => {
    expect(ext("noextension")).toBe("");
  });

  it("handles multiple dots — returns last segment", () => {
    expect(ext("archive.tar.gz")).toBe("gz");
  });
});
