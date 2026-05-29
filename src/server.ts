import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type CloudConvertJobTask = {
  name?: string;
  operation?: string;
  status?: string;
  result?: {
    files?: Array<{
      filename?: string;
      url?: string;
    }>;
  };
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) return "";
  return fileName.slice(dot + 1).toLowerCase();
}

function readCloudConvertApiKey(env: unknown): string {
  const envMap = (env && typeof env === "object" ? (env as Record<string, unknown>) : {}) ?? {};
  const fromRuntime = envMap.CLOUDCONVERT_API_KEY;
  if (typeof fromRuntime === "string" && fromRuntime.trim().length > 0) return fromRuntime;

  const fromProcess = typeof process !== "undefined" ? process.env.CLOUDCONVERT_API_KEY : undefined;
  if (typeof fromProcess === "string" && fromProcess.trim().length > 0) return fromProcess;

  return "";
}

async function convertOfficeDocumentToPdf(
  sourceUrl: string,
  sourceFileName: string,
  apiKey: string,
): Promise<Response> {
  const inputFormat = fileExtension(sourceFileName);
  if (!/(doc|docx|ppt|pptx|pps|ppsx|xls|xlsx)/.test(inputFormat)) {
    return jsonResponse({ error: "Unsupported file extension for Office conversion." }, 400);
  }

  const jobResponse = await fetch("https://sync.api.cloudconvert.com/v2/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      tasks: {
        "import-file": {
          operation: "import/url",
          url: sourceUrl,
        },
        "convert-file": {
          operation: "convert",
          input: "import-file",
          input_format: inputFormat,
          output_format: "pdf",
        },
        "export-file": {
          operation: "export/url",
          input: "convert-file",
          archive_multiple_files: false,
          inline: true,
        },
      },
    }),
  });

  if (!jobResponse.ok) {
    const text = await jobResponse.text().catch(() => "");
    return jsonResponse({ error: "CloudConvert job creation failed.", details: text }, 502);
  }

  const payload = (await jobResponse.json()) as {
    data?: {
      tasks?: CloudConvertJobTask[];
    };
  };

  const tasks = payload.data?.tasks ?? [];
  const exportTask = tasks.find(
    (task) => task.operation === "export/url" && task.status === "finished",
  );
  const pdfUrl = exportTask?.result?.files?.[0]?.url;

  if (!pdfUrl) {
    return jsonResponse({ error: "CloudConvert did not return a PDF export URL." }, 502);
  }

  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    const text = await pdfResponse.text().catch(() => "");
    return jsonResponse({ error: "Fetching converted PDF failed.", details: text }, 502);
  }

  const pdfBuffer = await pdfResponse.arrayBuffer();
  const safeBaseName = sourceFileName.replace(/\.[^.]+$/, "") || "preview";
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "cache-control": "no-store",
      "content-disposition": `inline; filename="${safeBaseName}.pdf"`,
    },
  });
}

async function handleOfficeToPdfRequest(request: Request, env: unknown): Promise<Response> {
  const apiKey = readCloudConvertApiKey(env);
  if (!apiKey) {
    return jsonResponse(
      { error: "Office conversion is not configured. Missing CLOUDCONVERT_API_KEY." },
      501,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const payload = body as { sourceUrl?: string; fileName?: string };
  const sourceUrl = payload.sourceUrl?.trim();
  const fileName = payload.fileName?.trim();

  if (!sourceUrl || !fileName) {
    return jsonResponse({ error: "Both sourceUrl and fileName are required." }, 400);
  }

  try {
    return await convertOfficeDocumentToPdf(sourceUrl, fileName, apiKey);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Office conversion failed unexpectedly." }, 500);
  }
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const requestUrl = new URL(request.url);
    if (request.method === "POST" && requestUrl.pathname === "/api/office-to-pdf") {
      return await handleOfficeToPdfRequest(request, env);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
