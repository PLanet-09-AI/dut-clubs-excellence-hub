# SALEA 2026 Codebase Restructuring Proposal

## Current State Analysis

### 📊 Problem Areas

**1. Monolithic Files**
- `src/routes/admin.tsx` - 4,300+ lines (all admin logic in one file)
- `src/components/EvidenceUploader.tsx` - Large component with mixed concerns
- `scripts/` - 15+ scripts with inconsistent patterns

**2. Poor Organization**
- Routes at root level (no logical grouping)
- Utils scattered across `src/lib/`
- Data constants mixed with business logic
- Components not grouped by feature

**3. Maintainability Issues**
- Hard to find related code
- Duplicate patterns across components
- Unclear dependencies between modules
- Difficult to test individual features

**4. Script Management**
- Database utilities duplicated across scripts
- No shared utilities for common operations
- Inconsistent error handling
- Mix of data queries and transformations

---

## Proposed Structure

### 📁 New Directory Layout

```
dut-excellence-awards/
├── src/
│   ├── app/
│   │   ├── admin/                          # Admin feature
│   │   │   ├── admin.layout.tsx            # Admin layout wrapper
│   │   │   ├── admin.page.tsx              # Main admin page
│   │   │   ├── components/
│   │   │   │   ├── NominationsList.tsx
│   │   │   │   ├── NominationDetail.tsx
│   │   │   │   ├── DocumentPreview.tsx
│   │   │   │   ├── AdminSettings.tsx
│   │   │   │   └── AuditLogs.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useNominations.ts
│   │   │   │   ├── usePreview.ts
│   │   │   │   └── useAdminSettings.ts
│   │   │   ├── types/
│   │   │   │   └── admin.types.ts
│   │   │   └── utils/
│   │   │       ├── preview.utils.ts
│   │   │       ├── email.utils.ts
│   │   │       └── export.utils.ts
│   │   │
│   │   ├── nominate/                       # Nomination submission feature
│   │   │   ├── nominate.layout.tsx
│   │   │   ├── [categoryId].page.tsx
│   │   │   ├── components/
│   │   │   │   ├── NominationForm.tsx
│   │   │   │   ├── QuestionCard.tsx
│   │   │   │   ├── EvidenceUploader.tsx
│   │   │   │   └── ProgressIndicator.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useNominationForm.ts
│   │   │   │   ├── useFileUpload.ts
│   │   │   │   └── useDraftSave.ts
│   │   │   ├── types/
│   │   │   │   └── nomination.types.ts
│   │   │   └── utils/
│   │   │       ├── validation.ts
│   │   │       ├── fileHandling.ts
│   │   │       └── formPersist.ts
│   │   │
│   │   ├── judge/                          # Judge scoring feature
│   │   │   ├── judge.layout.tsx
│   │   │   ├── judge.page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ScoringCard.tsx
│   │   │   │   ├── NomineeInfo.tsx
│   │   │   │   └── ScoreBreakdown.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useJudgeScoring.ts
│   │   │   ├── types/
│   │   │   │   └── judge.types.ts
│   │   │   └── utils/
│   │   │       └── scoring.utils.ts
│   │   │
│   │   ├── shared/                         # Shared across features
│   │   │   ├── components/
│   │   │   │   ├── SiteNav.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── SkeletonLoaders.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useMobile.ts
│   │   │   │   └── useToast.ts
│   │   │   ├── types/
│   │   │   │   ├── common.types.ts
│   │   │   │   ├── firebase.types.ts
│   │   │   │   └── user.types.ts
│   │   │   └── utils/
│   │   │       ├── date.ts
│   │   │       ├── formatting.ts
│   │   │       └── validation.ts
│   │   │
│   │   └── pages/                          # Static/public pages
│   │       ├── index.tsx
│   │       ├── guide.tsx
│   │       ├── winners.tsx
│   │       ├── leaderboard.tsx
│   │       ├── demo.tsx
│   │       └── components/
│   │           ├── EventProgram.tsx
│   │           ├── PhotoBackdrop.tsx
│   │           └── AwardScene.tsx
│   │
│   ├── core/
│   │   ├── firebase/
│   │   │   ├── config.ts
│   │   │   ├── auth.ts
│   │   │   ├── db.ts
│   │   │   ├── storage.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── api/                            # Netlify functions & utilities
│   │   │   ├── client.ts
│   │   │   ├── endpoints.ts
│   │   │   └── handlers.ts
│   │   │
│   │   └── env.ts
│   │
│   ├── data/
│   │   ├── awards.ts                       # Award categories & config
│   │   ├── faculties.ts
│   │   ├── validators.ts
│   │   └── seed.ts
│   │
│   ├── utils/
│   │   ├── office-to-pdf.ts
│   │   ├── download.ts
│   │   ├── tracking.ts
│   │   ├── export.ts
│   │   └── errors.ts
│   │
│   ├── hooks/
│   │   ├── useTrackInteraction.ts
│   │   └── useErrorBoundary.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── nomination.ts
│   │   ├── user.ts
│   │   └── audit.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   ├── animations.css
│   │   └── components.css
│   │
│   ├── router.tsx
│   ├── start.ts
│   └── app.tsx
│
├── netlify/
│   ├── functions/
│   │   ├── shared/                         # Shared utilities for functions
│   │   │   ├── firebase-admin.ts
│   │   │   ├── email.ts
│   │   │   ├── types.ts
│   │   │   └── errors.ts
│   │   │
│   │   └── reminders/                      # Grouped by feature
│   │       ├── send-nominee-reminder.mts
│   │       ├── send-reminders.mts
│   │       └── types.ts
│   │   │
│   │   └── uploads/
│   │       ├── office-to-pdf.mts
│   │       └── types.ts
│   │
│   └── tsconfig.json
│
├── scripts/
│   ├── lib/                                # Shared utilities
│   │   ├── firebase.js
│   │   ├── logger.js
│   │   └── utils.js
│   │
│   ├── database/                           # DB operations
│   │   ├── check-nominations.mjs
│   │   ├── verify-data.mjs
│   │   └── analyze-files.mjs
│   │
│   ├── migration/                          # Data migration
│   │   ├── merge-corrupted-nominations.js
│   │   ├── recover-orphaned-files.mjs
│   │   └── cleanup-corrupted-nominations.mts
│   │
│   ├── tools/                              # Utility scripts
│   │   ├── seed-winners.mjs
│   │   ├── seed-winner-images.mjs
│   │   ├── set-storage-cors.mjs
│   │   └── generate-netlify-index.mjs
│   │
│   └── README.md                           # Script documentation
│
├── public/
│   ├── manifest.webmanifest
│   ├── winners/
│   ├── backdrops/
│   └── README.md
│
├── .env.local
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Detailed Refactoring Plan

### Phase 1: Extract Admin Feature (Week 1)

**Goal**: Break down `admin.tsx` into logical components

#### 1a. Core Components

**NominationsList.tsx**
```typescript
// Extract nomination list table, filtering, search
// ~300 lines
// Dependencies: Firestore, useNominations hook
```

**NominationDetail.tsx**
```typescript
// Extract nomination detail view, status management
// ~400 lines
// Dependencies: Firestore, Firebase Storage
```

**DocumentPreview.tsx**
```typescript
// Extract all preview logic (image, video, PDF, Office)
// ~500 lines
// Dependencies: office-to-pdf utils, file type detection
```

#### 1b. Hooks (Extract state management)

**useNominations.ts**
```typescript
// Firestore listener for nominations
// useEffect hook to manage subscription
// Functions: filter, search, sort
export function useNominations(canManage: boolean)
```

**usePreview.ts**
```typescript
// Preview state management
// File detection, URL resolution
// Conversion tracking for Office files
export function usePreview(nomination: Nomination)
```

**useAdminSettings.ts**
```typescript
// Admin settings Firestore listener
// Judge score tracking
// Category management
export function useAdminSettings()
```

#### 1c. Utils

**preview.utils.ts**
- `getPreviewKind(fileName, url): 'image' | 'video' | 'pdf' | 'office'`
- `resolvePreviewUrl(file, conversion): string`
- `isPreviewable(fileName): boolean`

**email.utils.ts**
- `buildReminderEmail(nominee, incomplete): EmailParams`
- `validateEmailList(emails): boolean`

**export.utils.ts**
- `exportNominationsToCSV(nominations): Blob`
- `exportScoresToExcel(scores): Blob`

---

### Phase 2: Extract Nomination Feature (Week 2)

**Goal**: Organize nomination submission logic

#### 2a. Components

**NominationForm.tsx** - Main form wrapper
**QuestionCard.tsx** - Individual question UI
**EvidenceUploader.tsx** - File upload widget

#### 2b. Hooks

**useNominationForm.ts**
```typescript
// Form state, validation, submission
export function useNominationForm(categoryId: string)
```

**useFileUpload.ts**
```typescript
// File upload to Firebase Storage
// Progress tracking, error handling
export function useFileUpload(path: string)
```

**useDraftSave.ts**
```typescript
// Auto-save draft to localStorage
// Conflict resolution
export function useDraftSave(categoryId: string)
```

---

### Phase 3: Organize Scripts (Week 3)

**Goal**: Create shared utilities and group scripts by domain

#### 3a. Create `scripts/lib/`

**firebase.js**
```javascript
// Shared Firebase admin setup
// Connection pooling
export const db = getFirestore();
export const bucket = getStorage().bucket();
```

**logger.js**
```javascript
// Consistent logging format
export function logSuccess(msg, data)
export function logError(msg, error)
export function logInfo(msg)
```

**utils.js**
```javascript
// Common operations
export function countFiles(uploads)
export function listFiles(uploads)
export function parseNominationPath(path)
```

#### 3b. Group Scripts

**Database operations**: `scripts/database/`
- ✅ check-nominations.mjs (new name: verify-nominations.mjs)
- ✅ analyze-files.mjs (consolidate: check-file-patterns, analyze-missing-file)
- ✅ verify-data.mjs (consolidate: check-storage-files, show-yonwaba)

**Data migration**: `scripts/migration/`
- ✅ merge-corrupted-nominations.js
- ✅ recover-orphaned-files.mjs
- ✅ cleanup-corrupted-nominations.mts

**Tools**: `scripts/tools/`
- ✅ seed-winners.mjs
- ✅ seed-winner-images.mjs
- ✅ set-storage-cors.mjs
- ✅ generate-netlify-index.mjs

---

### Phase 4: Extract Shared Code (Week 4)

**Goal**: Create reusable modules

#### 4a. Core Modules

**core/firebase/db.ts**
```typescript
// Firestore queries & listeners
export async function getNomination(id: string)
export function onNominationsChange(callback)
export async function updateNominationStatus(id, status)
```

**core/firebase/storage.ts**
```typescript
// Firebase Storage operations
export async function uploadFile(path, file)
export async function deleteFile(path)
export function getDownloadUrl(path)
```

**core/api/endpoints.ts**
```typescript
// Netlify function URLs & types
export const ENDPOINTS = {
  sendReminder: '/.netlify/functions/send-nominee-reminder',
  sendBulkReminders: '/.netlify/functions/send-reminders',
  convertOffice: '/.netlify/functions/office-to-pdf',
}
```

#### 4b. Utilities

**utils/office-to-pdf.ts** (already exists - move to utils/)
**utils/download.ts** (move downloadGuidePDF, downloadProgrammePDF)
**utils/export.ts** (consolidate export logic)
**utils/tracking.ts** (already exists - no change)

---

## File Size Reduction Targets

| File | Current | Target | Reduction |
|------|---------|--------|-----------|
| admin.tsx | 4,300+ | 600 | -86% |
| EvidenceUploader.tsx | 600+ | 300 | -50% |
| index.tsx | 600+ | 400 | -33% |
| **Total app code** | ~8,000 | ~5,500 | **-31%** |

---

## Implementation Timeline

**Week 1**: Extract Admin Feature
- [ ] Create admin/ folder structure
- [ ] Extract NominationsList.tsx
- [ ] Extract NominationDetail.tsx  
- [ ] Extract DocumentPreview.tsx
- [ ] Extract useNominations, usePreview, useAdminSettings hooks
- [ ] Create admin utils

**Week 2**: Extract Nomination Feature
- [ ] Create nominate/ folder structure
- [ ] Move/extract form components
- [ ] Extract form hooks
- [ ] Create validation utils

**Week 3**: Reorganize Scripts
- [ ] Create scripts/lib/ shared modules
- [ ] Group scripts by domain
- [ ] Update all script imports
- [ ] Test all scripts

**Week 4**: Core Modules & Polish
- [ ] Create core/firebase/ modules
- [ ] Create core/api/ modules
- [ ] Move utilities to proper locations
- [ ] Run full test suite
- [ ] Update documentation

---

## Benefits

✅ **Readability**: Files 300-600 lines (vs 4,300+)
✅ **Maintainability**: Clear feature boundaries
✅ **Testability**: Isolated hooks & utils
✅ **Reusability**: Shared modules reduce duplication
✅ **Onboarding**: New developers find code faster
✅ **Performance**: Tree-shaking unused features
✅ **Scalability**: Easy to add new features

---

## Rollback Plan

Each phase is a complete git commit. If issues arise:
1. Revert to previous commit
2. Fix issues in branch
3. Re-merge specific changes

---

## Success Metrics

- [ ] All files < 700 lines
- [ ] 100% TypeScript compilation
- [ ] All tests passing
- [ ] Build time same or faster
- [ ] No runtime errors
- [ ] Clear feature folders
