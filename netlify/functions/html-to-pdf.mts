/**
 * html-to-pdf — server-side PDF generation from HTML.
 *
 * How it works:
 *   1. Client POSTs { html, fileName } to `/api/html-to-pdf`
 *   2. Function receives HTML string, renders to PDF using Puppeteer + Chromium
 *   3. Uploads PDF to Firebase Cloud Storage
 *   4. Returns { downloadUrl } with a signed URL valid for 7 days
 *
 * Avoids html2pdf.js client-side limitations (oklch colors, etc.)
 */

import { Handler } from "@netlify/functions";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Initialize Firebase Admin if not already done
let adminApp: admin.app.App;
const getAdminApp = () => {
  if (adminApp) return adminApp;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(process.cwd(), "student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json");

  if (!fs.existsSync(serviceAccountPath)) {
    console.warn(`Firebase service account not found at ${serviceAccountPath}`);
  }

  adminApp = admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"))
    ),
    storageBucket: "student-services-745d5.appspot.com",
  });

  return adminApp;
};

const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { html, fileName } = JSON.parse(event.body || "{}");

    if (!html || !fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing html or fileName" }),
      };
    }

    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-z0-9.-]/gi, "_");

    // Launch Puppeteer with Chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set HTML content with proper styling
    await page.setContent(html, { waitUntil: "networkidle2" });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
    });

    await browser.close();

    // Upload to Firebase Cloud Storage
    const adminAppInstance = getAdminApp();
    const bucket = admin.storage(adminAppInstance).bucket();

    const timestamp = new Date().toISOString().split("T")[0];
    const storagePath = `pdfs/${timestamp}/${sanitizedFileName}`;
    const file = bucket.file(storagePath);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: "application/pdf",
      },
    });

    // Generate a signed URL (valid for 7 days)
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        downloadUrl: signedUrl,
        storagePath,
      }),
    };
  } catch (error: unknown) {
    console.error("PDF generation failed:", error);
    const message = error instanceof Error ? error.message : "PDF generation failed";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    };
  }
};

export { handler };
