/**
 * Document Validation Utilities
 * 
 * Validates that all required supporting documents are uploaded
 * for each nomination question that specifies evidence requirements.
 */

import { AWARD_CATEGORIES, type AwardCategory } from "@/data/awards";
import type { EvidenceUploads } from "@/components/EvidenceUploader";

export interface DocumentRequirement {
  questionId: string;
  questionPrompt: string;
  evidenceLabels: string[];
  isRequired: boolean;
}

export interface DocumentValidationResult {
  isValid: boolean;
  missingDocuments: string[];
  requirements: DocumentRequirement[];
  uploadedCount: number;
  requiredCount: number;
}

/**
 * Convert nested Firestore uploads structure to flat EvidenceUploads format
 * Firestore stores: Record<questionId, Record<slotKey, UploadedFile[]>>
 * EvidenceUploads expects: Record<slotKey, UploadedFile[]>
 * 
 * When checking a specific question's uploads, use the nested structure directly.
 */
export function flattenFirestoreUploads(
  firestoreUploads: Record<string, Record<string, unknown[]>> | undefined,
  questionId: string
): EvidenceUploads {
  if (!firestoreUploads || !firestoreUploads[questionId]) {
    return {};
  }
  return firestoreUploads[questionId] as EvidenceUploads;
}

/**
 * Get all document requirements for a specific award category
 */
export function getDocumentRequirements(categoryId: string): DocumentRequirement[] {
  const category = AWARD_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return [];

  return category.questions
    .filter((q) => q.evidence && q.evidence.length > 0)
    .map((q) => ({
      questionId: q.id,
      questionPrompt: q.prompt,
      evidenceLabels: q.evidence,
      isRequired: true, // All evidence questions are required
    }));
}

/**
 * Check if all required documents have been uploaded
 * Handles both flat uploads (from form) and nested uploads (from Firestore)
 * 
 * When called from nomination form: uploads is flat Record<slotKey, UploadedFile[]>
 * When called from admin: uploads is nested Record<questionId, Record<slotKey, UploadedFile[]>>
 * 
 * Returns validation result with details about missing documents
 */
export function validateDocumentsForCategory(
  categoryId: string,
  uploads: EvidenceUploads | Record<string, Record<string, unknown[]>>
): DocumentValidationResult {
  const requirements = getDocumentRequirements(categoryId);
  const missingDocuments: string[] = [];
  let uploadedCount = 0;
  let requiredCount = 0;

  for (const req of requirements) {
    // Try to detect if uploads is nested (Firestore) or flat (form)
    // Nested: uploads[questionId] is an object with slotKey properties
    // Flat: uploads has slotKey properties directly (e0, e1, etc.)
    const questionUploads = uploads[req.questionId];
    let isNested = false;
    let flatUploadsBySlot: Record<string, unknown[]> = {};

    if (questionUploads && typeof questionUploads === 'object') {
      // Check if this looks like a nested structure (has e0, e1, etc. keys)
      const keys = Object.keys(questionUploads);
      if (keys.some(k => k.startsWith('e') && /^\d+$/.test(k.substring(1)))) {
        isNested = true;
        flatUploadsBySlot = questionUploads as Record<string, unknown[]>;
      }
    }

    // If not nested, assume flat structure - get uploads for this question's slots
    if (!isNested) {
      // For flat structure (form context), get all e0, e1, e2... for this question
      req.evidenceLabels.forEach((_, index) => {
        const slotKey = `e${index}`;
        const slotFiles = (uploads as EvidenceUploads)[slotKey];
        if (slotFiles) {
          flatUploadsBySlot[slotKey] = slotFiles as unknown[];
        }
      });
    }

    // Now validate the flattened slots
    if (!flatUploadsBySlot || Object.keys(flatUploadsBySlot).length === 0) {
      // All evidence slots are missing
      req.evidenceLabels.forEach((label) => {
        missingDocuments.push(`${label} (for: "${req.questionPrompt.substring(0, 50)}...")`);
      });
      requiredCount += req.evidenceLabels.length;
    } else {
      // Check each evidence slot
      req.evidenceLabels.forEach((label, index) => {
        const slotKey = `e${index}`;
        const slotFiles = flatUploadsBySlot[slotKey];
        
        requiredCount++;
        
        if (slotFiles && Array.isArray(slotFiles) && slotFiles.length > 0) {
          uploadedCount++;
        } else {
          missingDocuments.push(`${label} (for: "${req.questionPrompt.substring(0, 50)}...")`);
        }
      });
    }
  }

  return {
    isValid: missingDocuments.length === 0,
    missingDocuments,
    requirements,
    uploadedCount,
    requiredCount,
  };
}

/**
 * Get a human-readable summary of missing documents
 * Handles both flat uploads (from form) and nested uploads (from Firestore)
 */
export function getMissingDocumentsSummary(
  categoryId: string,
  uploads: EvidenceUploads | Record<string, Record<string, unknown[]>>
): string {
  const validation = validateDocumentsForCategory(categoryId, uploads);
  
  if (validation.isValid) {
    return 'All required documents uploaded ✓';
  }

  if (validation.missingDocuments.length === 0) {
    return 'No document requirements for this category';
  }

  return `Missing ${validation.missingDocuments.length} document${validation.missingDocuments.length !== 1 ? 's' : ''}`;
}

/**
 * Get the count of incomplete nominations from a list
 */
export function getIncompleteNominationCount(
  nominations: Array<{
    categoryId: string;
    uploads?: Record<string, Record<string, Array<{ name: string; url: string }>>>;
  }>
): number {
  return nominations.filter((nom) => {
    const validation = validateDocumentsForCategory(nom.categoryId, nom.uploads || {});
    return !validation.isValid;
  }).length;
}

/**
 * Generate a list of incomplete items for a specific nomination
 * Handles both flat uploads (from form) and nested uploads (from Firestore)
 */
export function getIncompleteItemsList(
  categoryId: string,
  uploads: EvidenceUploads | Record<string, Record<string, unknown[]>>
): string[] {
  const validation = validateDocumentsForCategory(categoryId, uploads);
  return validation.missingDocuments;
}
