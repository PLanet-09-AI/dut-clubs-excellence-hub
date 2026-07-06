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
 * VALIDATION STRATEGY:
 * - For each question with evidence requirements, check if AT LEAST ONE document is provided
 * - Both file uploads and SharePoint/OneDrive links count as valid evidence
 * - This allows flexibility: users can upload PDFs, links, or any combination
 * - Missing: if a question has no documents of any kind
 * 
 * When called from nomination form: uploads is Record<questionId, Record<slotKey, UploadedFile[]>>
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
  let requiredCount = requirements.length;

  // Debug: Log what we received
  if (typeof window !== 'undefined') {
    console.log('📋 [Validation] Input uploads structure:', {
      uploadKeys: Object.keys(uploads),
      uploadStructure: uploads,
      requirementCount: requirements.length,
    });
  }

  for (const req of requirements) {
    // Try to detect if uploads is nested (Firestore) or flat (form)
    // Both form and admin now send: uploads[questionId] → Record<slotKey, UploadedFile[]>
    const questionUploads = uploads[req.questionId];
    
    if (typeof window !== 'undefined') {
      console.log(`📋 [Validation] Question "${req.questionId}":`, {
        questionExists: !!questionUploads,
        questionUploadKeys: questionUploads ? Object.keys(questionUploads) : [],
        evidenceLabelCount: req.evidenceLabels.length,
        evidenceLabels: req.evidenceLabels,
      });
    }

    let isNested = false;
    let flatUploadsBySlot: Record<string, unknown[]> = {};

    if (questionUploads && typeof questionUploads === 'object') {
      // Check if this looks like a nested structure (has e0, e1, etc. keys)
      const keys = Object.keys(questionUploads);
      if (keys.some(k => k.startsWith('e') && /^\d+$/.test(k.substring(1)))) {
        isNested = true;
        flatUploadsBySlot = questionUploads as Record<string, unknown[]>;
        
        if (typeof window !== 'undefined') {
          console.log(`  ✓ Detected nested structure for "${req.questionId}":`, {
            slotKeys: Object.keys(flatUploadsBySlot),
            slotCounts: Object.fromEntries(
              Object.entries(flatUploadsBySlot).map(([k, v]) => [k, Array.isArray(v) ? v.length : 'not-array'])
            ),
          });
        }
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
      
      if (typeof window !== 'undefined' && Object.keys(flatUploadsBySlot).length > 0) {
        console.log(`  ⚠️ Using flat structure for "${req.questionId}":`, {
          slotKeys: Object.keys(flatUploadsBySlot),
        });
      }
    }

    // Check if ANY evidence has been uploaded for this question
    // This counts both PDFs/files AND SharePoint/OneDrive links
    let hasAnyEvidence = false;
    
    if (flatUploadsBySlot && Object.keys(flatUploadsBySlot).length > 0) {
      // Check if any slot has files (regardless of type: file or sharepoint)
      for (const slotFiles of Object.values(flatUploadsBySlot)) {
        if (Array.isArray(slotFiles) && slotFiles.length > 0) {
          hasAnyEvidence = true;
          break;
        }
      }
    }

    if (typeof window !== 'undefined') {
      console.log(`  📄 Question "${req.questionId}" evidence check:`, {
        hasAnyEvidence,
        slotsWithFiles: Object.entries(flatUploadsBySlot || {}).map(([slot, files]) => ({
          slot,
          count: Array.isArray(files) ? files.length : 0,
          types: Array.isArray(files) ? files.map((f: any) => f.type || 'file') : [],
        })),
      });
    }

    // For this question, we need at least ONE evidence slot to have documents
    // Users can upload PDFs, links, or any combination
    if (hasAnyEvidence) {
      uploadedCount++;
    } else {
      // Mark entire question as missing
      missingDocuments.push(`${req.questionPrompt.substring(0, 50)}...`);
    }
  }

  if (typeof window !== 'undefined') {
    console.log('📊 [Validation] Summary:', {
      isValid: missingDocuments.length === 0,
      uploadedCount,
      requiredCount,
      missingCount: missingDocuments.length,
      missingDocuments,
    });
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
