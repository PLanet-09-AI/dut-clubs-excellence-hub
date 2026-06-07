import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import { handler } from "./office-to-pdf.mts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function createEvent({ method = "POST", body } = {}) {
  return {
    httpMethod: method,
    body,
  };
}

function parseBody(response) {
  return JSON.parse(response.body);
}

test("rejects non-POST requests", async () => {
  globalThis.fetch = async () => {
    throw new Error("fetch should not be called");
  };

  const response = await handler(createEvent({ method: "GET" }));

  assert.equal(response.statusCode, 405);
  assert.deepEqual(parseBody(response), { error: "Method not allowed." });
});

test("rejects invalid JSON body", async () => {
  const response = await handler(createEvent({ body: "{" }));

  assert.equal(response.statusCode, 400);
  assert.deepEqual(parseBody(response), { error: "Invalid JSON body." });
});

test("rejects when required fields are missing", async () => {
  const response = await handler(createEvent({ body: JSON.stringify({ sourceUrl: "  " }) }));

  assert.equal(response.statusCode, 400);
  assert.deepEqual(parseBody(response), { error: "Both sourceUrl and fileName are required." });
});

test("rejects unsupported file formats", async () => {
  const response = await handler(
    createEvent({
      body: JSON.stringify({
        sourceUrl: "https://example.com/file.txt",
        fileName: "file.txt",
      }),
    }),
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(parseBody(response), {
    error: "Unsupported format: .txt. Supported: .doc, .docx, .xls, .xlsx, .pptx, .ppsx",
  });
});

test("returns 502 when download returns non-OK status", async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
  });

  const response = await handler(
    createEvent({
      body: JSON.stringify({
        sourceUrl: "https://example.com/missing.docx",
        fileName: "missing.docx",
      }),
    }),
  );

  assert.equal(response.statusCode, 502);
  assert.deepEqual(parseBody(response), { error: "Failed to download source file (HTTP 404)." });
});

test("returns 502 when download throws an error", async () => {
  globalThis.fetch = async () => {
    throw new Error("network down");
  };

  const response = await handler(
    createEvent({
      body: JSON.stringify({
        sourceUrl: "https://example.com/fail.pptx",
        fileName: "fail.pptx",
      }),
    }),
  );

  assert.equal(response.statusCode, 502);
  assert.deepEqual(parseBody(response), { error: "Failed to download source file: network down" });
});

test("returns 422 when pptx parsing fails", async () => {
  const bytes = new TextEncoder().encode("not a valid pptx");
  globalThis.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => bytes.buffer,
  });

  const response = await handler(
    createEvent({
      body: JSON.stringify({
        sourceUrl: "https://example.com/broken.pptx",
        fileName: "broken.pptx",
      }),
    }),
  );

  assert.equal(response.statusCode, 422);
  const payload = parseBody(response);
  assert.match(
    payload.error,
    /^Failed to parse document\. The file may be corrupt or password-protected:/,
  );
});
