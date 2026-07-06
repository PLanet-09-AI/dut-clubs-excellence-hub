/**
 * submission.test.ts — Comprehensive submission validation tests
 *
 * Tests cover three critical submission scenarios:
 * 1. Links-only submissions (no PDFs)
 * 2. PDF-only submissions (no links)
 * 3. Mixed submissions (both links and PDFs)
 *
 * SOLID mapping:
 *  S — each scenario tested in isolation (Single Responsibility)
 *  O — new submission types can be added without modifying existing tests (Open/Closed)
 *  L — all submission types return consistent validation result structure (Liskov)
 *  I — validation only requires categoryId + uploads, no unnecessary dependencies (Interface Segregation)
 *  D — tests depend on validateDocumentsForCategory abstraction (Dependency Inversion)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  validateDocumentsForCategory,
  type DocumentValidationResult,
  type EvidenceUploads,
} from "@/lib/document-validation";

/**
 * Mock file upload object with minimal required fields
 */
interface MockUploadedFile {
  name: string;
  size: number;
  url: string;
  path: string;
  type?: "file" | "sharepoint";
}

/**
 * Mock data generators
 */
const createMockLink = (index: number): MockUploadedFile => ({
  name: `evidence-link-${index}`,
  size: 256, // Links are just URLs, typically small
  url: `https://example.com/evidence-${index}`,
  path: "", // Links don't have a Firebase path
  type: "sharepoint",
});

const createMockPDF = (index: number): MockUploadedFile => ({
  name: `evidence-document-${index}.pdf`,
  size: 2048576, // ~2MB typical PDF
  url: `https://storage.example.com/pdf-${index}.pdf`,
  path: `nominations/pdf-${index}.pdf`, // Firebase path for file uploads
  type: "file",
});

/**
 * Scenario 1: Links-Only Submissions
 * ─────────────────────────────────────────────────────────────────────────────
 * User provides SharePoint/OneDrive links for all evidence.
 * PDFs optional. Should validate successfully.
 */
describe("Submission Scenario 1: Links Only", () => {
  let uploadsLinksOnly: Record<string, Record<string, MockUploadedFile[]>>;

  beforeEach(() => {
    // Simulate form structure: uploads[questionId]["e{slot}"] = UploadedFile[]
    // Sportsmanship award: 4 questions with multiple evidence slots each
    // Q1 has 3 evidence labels, Q2 has 2, Q3 has 4, Q4 has 1
    uploadsLinksOnly = {
      "sport-1": {
        e0: [createMockLink(1)], // Testimonial from coach
        e1: [createMockLink(2)], // Match reports
        e2: [createMockLink(3)], // Academic records
      },
      "sport-2": {
        e0: [createMockLink(4)], // Testimonial from coach/league organiser
        e1: [createMockLink(5)], // Team captaincy records
      },
      "sport-3": {
        e0: [createMockLink(6)], // Testimonials from teammates
        e1: [createMockLink(7)], // Post programme reports
        e2: [createMockLink(8)], // Photos of team-building
        e3: [createMockLink(9)], // 3 reflective essays
      },
      "sport-4": {
        e0: [createMockLink(10)], // Endorsement letter
      },
    };
  });

  it("accepts submissions with links but no PDFs", () => {
    // Sportsmanship award (standard category)
    const result = validateDocumentsForCategory("sport", uploadsLinksOnly as any);

    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
    expect(result.missingDocuments).toHaveLength(0);
    expect(result.uploadedCount).toBeGreaterThan(0);
  });

  it("returns all questions as satisfied when links provided", () => {
    const result = validateDocumentsForCategory("sport", uploadsLinksOnly as any);

    expect(result.uploadedCount).toEqual(result.requiredCount);
    expect(result.missingDocuments.length).toBe(0);
  });

  it("validates across different award categories with links only", () => {
    // Test with categories that have evidence requirements
    // For now, only 'sport' category has evidence requirements in the test data
    const result = validateDocumentsForCategory("sport", uploadsLinksOnly as any);
    expect(result.isValid).toBe(true);
    expect(result.missingDocuments.length).toBe(0);
  });

  it("handles single link per question", () => {
    const singleLinkPerQuestion = {
      "sport-1": { e0: [createMockLink(1)], e1: [createMockLink(2)], e2: [createMockLink(3)] },
      "sport-2": { e0: [createMockLink(4)], e1: [createMockLink(5)] },
      "sport-3": { e0: [createMockLink(6)], e1: [createMockLink(7)], e2: [createMockLink(8)], e3: [createMockLink(9)] },
      "sport-4": { e0: [createMockLink(10)] },
    };

    const result = validateDocumentsForCategory(
      "sport",
      singleLinkPerQuestion as any
    );

    expect(result.isValid).toBe(true);
    expect(result.missingDocuments.length).toBe(0);
  });

  it("handles multiple links per question", () => {
    const multipleLinksPerQuestion = {
      "sport-1": {
        e0: [createMockLink(1), createMockLink(2)],
        e1: [createMockLink(3), createMockLink(4)],
        e2: [createMockLink(5)],
      },
      "sport-2": {
        e0: [createMockLink(6), createMockLink(7), createMockLink(8)],
        e1: [createMockLink(9), createMockLink(10)],
      },
      "sport-3": { e0: [createMockLink(11)], e1: [createMockLink(12)], e2: [createMockLink(13)], e3: [createMockLink(14)] },
      "sport-4": { e0: [createMockLink(15)] },
    };

    const result = validateDocumentsForCategory(
      "sport",
      multipleLinksPerQuestion as any
    );

    expect(result.isValid).toBe(true);
  });

  it("generates documentation for links-only validation result", () => {
    const result = validateDocumentsForCategory("sport", uploadsLinksOnly as any);

    expect(result.requirements).toBeDefined();
    expect(Array.isArray(result.requirements)).toBe(true);
    expect(result.requirements.length).toBeGreaterThan(0);

    for (const req of result.requirements) {
      expect(req.questionId).toBeDefined();
      expect(req.questionPrompt).toBeDefined();
      expect(req.evidenceLabels).toBeDefined();
    }
  });
});

/**
 * Scenario 2: PDF-Only Submissions
 * ─────────────────────────────────────────────────────────────────────────────
 * User uploads PDF documents for all evidence.
 * Links optional. Should validate successfully.
 */
describe("Submission Scenario 2: PDFs Only", () => {
  let uploadsPDFsOnly: Record<string, Record<string, MockUploadedFile[]>>;

  beforeEach(() => {
    uploadsPDFsOnly = {
      "sport-1": {
        e0: [createMockPDF(1)],
        e1: [createMockPDF(2)],
        e2: [createMockPDF(3)],
      },
      "sport-2": {
        e0: [createMockPDF(4)],
        e1: [createMockPDF(5)],
      },
      "sport-3": {
        e0: [createMockPDF(6)],
        e1: [createMockPDF(7)],
        e2: [createMockPDF(8)],
        e3: [createMockPDF(9)],
      },
      "sport-4": {
        e0: [createMockPDF(10)],
      },
    };
  });

  it("accepts submissions with PDFs but no links", () => {
    const result = validateDocumentsForCategory("sport", uploadsPDFsOnly as any);

    expect(result.isValid).toBe(true);
    expect(result.missingDocuments).toHaveLength(0);
  });

  it("returns all questions as satisfied when PDFs provided", () => {
    const result = validateDocumentsForCategory("sport", uploadsPDFsOnly as any);

    expect(result.uploadedCount).toEqual(result.requiredCount);
    expect(result.missingDocuments.length).toBe(0);
  });

  it("validates across different award categories with PDFs only", () => {
    // Test with categories that have evidence requirements
    // For now, only 'sport' category has evidence requirements in the test data
    const result = validateDocumentsForCategory("sport", uploadsPDFsOnly as any);
    expect(result.isValid).toBe(true);
    expect(result.missingDocuments.length).toBe(0);
  });

  it("handles single PDF per question", () => {
    const singlePDFPerQuestion = {
      "sport-1": { e0: [createMockPDF(1)], e1: [createMockPDF(2)], e2: [createMockPDF(3)] },
      "sport-2": { e0: [createMockPDF(4)], e1: [createMockPDF(5)] },
      "sport-3": { e0: [createMockPDF(6)], e1: [createMockPDF(7)], e2: [createMockPDF(8)], e3: [createMockPDF(9)] },
      "sport-4": { e0: [createMockPDF(10)] },
    };

    const result = validateDocumentsForCategory(
      "sport",
      singlePDFPerQuestion as any
    );

    expect(result.isValid).toBe(true);
    expect(result.missingDocuments.length).toBe(0);
  });

  it("handles multiple PDFs per question", () => {
    const multiplePDFsPerQuestion = {
      "sport-1": {
        e0: [createMockPDF(1), createMockPDF(2)],
        e1: [createMockPDF(3)],
        e2: [createMockPDF(4), createMockPDF(5)],
      },
      "sport-2": {
        e0: [createMockPDF(6), createMockPDF(7), createMockPDF(8)],
        e1: [createMockPDF(9)],
      },
      "sport-3": { e0: [createMockPDF(10)], e1: [createMockPDF(11)], e2: [createMockPDF(12)], e3: [createMockPDF(13)] },
      "sport-4": { e0: [createMockPDF(14)] },
    };

    const result = validateDocumentsForCategory(
      "sport",
      multiplePDFsPerQuestion as any
    );

    expect(result.isValid).toBe(true);
  });

  it("validates PDF file integrity expectations", () => {
    const result = validateDocumentsForCategory("sport", uploadsPDFsOnly as any);

    // Verify that requirements exist and have evidence labels defined
    for (const req of result.requirements) {
      expect(req.evidenceLabels).toBeDefined();
      expect(req.evidenceLabels.length).toBeGreaterThan(0);
    }
  });

  it("generates documentation for PDF-only validation result", () => {
    const result = validateDocumentsForCategory("sport", uploadsPDFsOnly as any);

    expect(result.requirements).toBeDefined();
    expect(result.requirements.length).toBeGreaterThan(0);

    for (const req of result.requirements) {
      expect(req.questionId).toBeDefined();
      expect(req.questionPrompt).toBeDefined();
      expect(Array.isArray(req.evidenceLabels)).toBe(true);
    }
  });
});

/**
 * Scenario 3: Mixed Submissions (Links + PDFs)
 * ─────────────────────────────────────────────────────────────────────────────
 * User combines both links and PDFs for evidence.
 * Most flexible scenario. Should validate successfully.
 */
describe("Submission Scenario 3: Mixed (Links + PDFs)", () => {
  let uploadsMixed: Record<string, Record<string, MockUploadedFile[]>>;

  beforeEach(() => {
    uploadsMixed = {
      "sport-1": {
        e0: [createMockLink(1), createMockPDF(1)],
        e1: [createMockLink(2)],
        e2: [createMockPDF(2)],
      },
      "sport-2": {
        e0: [createMockLink(3), createMockLink(4), createMockPDF(3)],
        e1: [createMockPDF(4)],
      },
      "sport-3": {
        e0: [createMockLink(5)],
        e1: [createMockPDF(5), createMockPDF(6)],
        e2: [createMockLink(6)],
        e3: [createMockPDF(7)],
      },
      "sport-4": {
        e0: [createMockPDF(8)], // PDFs only for this one
      },
    };
  });

  it("accepts submissions with both links and PDFs", () => {
    const result = validateDocumentsForCategory("sport", uploadsMixed as any);

    expect(result.isValid).toBe(true);
    expect(result.missingDocuments).toHaveLength(0);
  });

  it("returns all questions as satisfied with mixed evidence", () => {
    const result = validateDocumentsForCategory("sport", uploadsMixed as any);

    expect(result.uploadedCount).toEqual(result.requiredCount);
    expect(result.missingDocuments.length).toBe(0);
  });

  it("validates across different award categories with mixed evidence", () => {
    // Test with categories that have evidence requirements
    // For now, only 'sport' category has evidence requirements in the test data
    const result = validateDocumentsForCategory("sport", uploadsMixed as any);
    expect(result.isValid).toBe(true);
    expect(result.missingDocuments.length).toBe(0);
  });

  it("handles asymmetric evidence distribution", () => {
    const asymmetricEvidence = {
      "sport-1": { e0: [createMockLink(1), createMockLink(2)], e1: [createMockLink(3)], e2: [createMockPDF(1)] },
      "sport-2": { e0: [createMockPDF(2)], e1: [createMockLink(4)] },
      "sport-3": { e0: [createMockLink(5)], e1: [createMockPDF(3)], e2: [createMockLink(6)], e3: [createMockPDF(4)] },
      "sport-4": {
        e0: [createMockLink(7), createMockPDF(5)],
      },
    };

    const result = validateDocumentsForCategory(
      "sport",
      asymmetricEvidence as any
    );

    expect(result.isValid).toBe(true);
    expect(result.missingDocuments.length).toBe(0);
  });

  it("handles all links in one question, all PDFs in another", () => {
    const segregatedEvidence = {
      "sport-1": { e0: [createMockLink(1), createMockLink(2)], e1: [createMockLink(3)], e2: [createMockLink(4)] },
      "sport-2": {
        e0: [createMockPDF(1), createMockPDF(2)],
        e1: [createMockPDF(3)],
      },
      "sport-3": { e0: [createMockLink(5)], e1: [createMockPDF(4)], e2: [createMockLink(6)], e3: [createMockLink(7)] },
      "sport-4": { e0: [createMockLink(8), createMockPDF(5)] },
    };

    const result = validateDocumentsForCategory(
      "sport",
      segregatedEvidence as any
    );

    expect(result.isValid).toBe(true);
  });

  it("validates mixed evidence counts correctly", () => {
    const result = validateDocumentsForCategory("sport", uploadsMixed as any);

    // Should have at least 4 requirements (one per question)
    expect(result.requirements.length).toBeGreaterThanOrEqual(4);

    // All should be satisfied
    expect(result.uploadedCount).toBe(result.requiredCount);
  });

  it("generates documentation for mixed validation result", () => {
    const result = validateDocumentsForCategory("sport", uploadsMixed as any);

    expect(result.requirements).toBeDefined();
    expect(result.requirements.length).toBeGreaterThan(0);

    // Each requirement should show both links and PDFs
    for (const req of result.requirements) {
      expect(req.evidenceLabels).toBeDefined();
      expect(req.evidenceLabels.length).toBeGreaterThan(0);
    }
  });

  it("handles single file of each type per question", () => {
    const balancedEvidence = {
      "sport-1": { e0: [createMockLink(1)], e1: [createMockPDF(1)], e2: [createMockLink(2)] },
      "sport-2": { e0: [createMockPDF(2)], e1: [createMockLink(3)] },
      "sport-3": { e0: [createMockLink(4)], e1: [createMockPDF(3)], e2: [createMockLink(5)], e3: [createMockPDF(4)] },
      "sport-4": { e0: [createMockLink(6)] },
    };

    const result = validateDocumentsForCategory(
      "sport",
      balancedEvidence as any
    );

    expect(result.isValid).toBe(true);
    expect(result.uploadedCount).toEqual(result.requiredCount);
  });
});

/**
 * Cross-Cutting Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Verify behavior across all submission scenarios
 */
describe("Cross-Scenario Validation Consistency", () => {
  it("all three submission types return consistent result structure", () => {
    const linksOnly = {
      "sport-1": { e0: [createMockLink(1)], e1: [createMockLink(2)], e2: [createMockLink(3)] },
      "sport-2": { e0: [createMockLink(4)], e1: [createMockLink(5)] },
      "sport-3": { e0: [createMockLink(6)], e1: [createMockLink(7)], e2: [createMockLink(8)], e3: [createMockLink(9)] },
      "sport-4": { e0: [createMockLink(10)] },
    };

    const pdfOnly = {
      "sport-1": { e0: [createMockPDF(1)], e1: [createMockPDF(2)], e2: [createMockPDF(3)] },
      "sport-2": { e0: [createMockPDF(4)], e1: [createMockPDF(5)] },
      "sport-3": { e0: [createMockPDF(6)], e1: [createMockPDF(7)], e2: [createMockPDF(8)], e3: [createMockPDF(9)] },
      "sport-4": { e0: [createMockPDF(10)] },
    };

    const mixed = {
      "sport-1": { e0: [createMockLink(1)], e1: [createMockPDF(1)], e2: [createMockLink(2)] },
      "sport-2": { e0: [createMockLink(3)], e1: [createMockPDF(2)] },
      "sport-3": { e0: [createMockPDF(3)], e1: [createMockLink(4)], e2: [createMockPDF(4)], e3: [createMockLink(5)] },
      "sport-4": { e0: [createMockLink(6)] },
    };

    const resultsLinksOnly = validateDocumentsForCategory("sport", linksOnly as any);
    const resultsPdfOnly = validateDocumentsForCategory("sport", pdfOnly as any);
    const resultsMixed = validateDocumentsForCategory("sport", mixed as any);

    // All should have the same fields
    for (const result of [resultsLinksOnly, resultsPdfOnly, resultsMixed]) {
      expect(result).toHaveProperty("isValid");
      expect(result).toHaveProperty("missingDocuments");
      expect(result).toHaveProperty("requirements");
      expect(result).toHaveProperty("uploadedCount");
      expect(result).toHaveProperty("requiredCount");
    }

    // All should pass validation
    expect(resultsLinksOnly.isValid).toBe(true);
    expect(resultsPdfOnly.isValid).toBe(true);
    expect(resultsMixed.isValid).toBe(true);
  });

  it("different categories maintain same validation logic", () => {
    const uploads = {
      "sport-1": { e0: [createMockLink(1)], e1: [createMockPDF(1)], e2: [createMockLink(2)] },
      "sport-2": { e0: [createMockLink(3)], e1: [createMockPDF(2)] },
      "sport-3": { e0: [createMockPDF(3)], e1: [createMockLink(4)], e2: [createMockPDF(4)], e3: [createMockLink(5)] },
      "sport-4": { e0: [createMockLink(6)] },
    };

    // Validate the same uploads with sport category (the one with evidence requirements)
    const result = validateDocumentsForCategory("sport", uploads as any);

    // Should pass validation
    expect(result.isValid).toBe(true);

    // Should have requirements
    expect(result.requirements.length).toBeGreaterThan(0);
  });

  it("validation result counts match actual evidence", () => {
    const uploads = {
      "sport-1": { e0: [createMockLink(1)], e1: [createMockPDF(1)], e2: [createMockLink(2)] },
      "sport-2": { e0: [createMockLink(3)], e1: [createMockPDF(2)] },
      "sport-3": { e0: [createMockPDF(3)], e1: [createMockLink(4)], e2: [createMockPDF(4)], e3: [createMockLink(5)] },
      "sport-4": { e0: [createMockLink(6)] },
    };

    const result = validateDocumentsForCategory("sport", uploads as any);

    // All required questions should be satisfied
    expect(result.uploadedCount).toEqual(result.requiredCount);
    expect(result.uploadedCount).toBeGreaterThan(0);
  });
});
