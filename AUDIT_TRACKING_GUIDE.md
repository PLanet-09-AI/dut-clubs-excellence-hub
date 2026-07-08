# Audit Tracking Integration Guide

## Overview
This guide shows where to add action tracking throughout the SALEA 2026 application to ensure complete audit trail coverage for both admin and judge activities.

## Quick Start: Adding Tracking to a Component

```typescript
import { useTrackInteraction, useTrackAction } from '@/hooks/useTrackInteraction';

// Option 1: Track on component mount
useTrackInteraction({
  module: 'nominations',
  action: 'VIEWED_NOMINATIONS',
  description: 'Opened nominations list',
  trackImmediately: true,
});

// Option 2: Track specific user actions
const { trackAction } = useTrackAction({ module: 'nominations' });
await trackAction(
  'CHANGED_NOMINATION_STATUS',
  'Shortlisted nomination #123',
  nominationId,
  { previousStatus: 'pending', newStatus: 'shortlisted' }
);
```

---

## Admin Panel Integration Points

### src/routes/admin.tsx

#### 1. Nominations List View
**Location:** Line ~1650 (activeSection === "nominations")
**Track:**
```typescript
useTrackInteraction({
  module: 'nominations',
  action: 'VIEWED_NOMINATIONS',
  description: `Viewed ${totalNominations} nominations`,
  trackImmediately: true,
});
```

#### 2. Filter & Search
**Location:** Line ~1800 (filter/search handlers)
**Track on filter change:**
```typescript
const { trackAction } = useTrackAction({ module: 'nominations' });

// When user selects category
await trackAction(
  'FILTERED_NOMINATIONS',
  `Filtered by category: ${selectedCategory}`,
  null,
  { category: selectedCategory, resultCount: filteredNominations.length }
);

// When user searches
await trackAction(
  'SEARCHED_NOMINATIONS',
  `Searched for: "${searchTerm}"`,
  null,
  { searchTerm, resultCount: searchResults.length }
);
```

#### 3. Nomination Status Changes
**Location:** Line ~2000 (where buttons change status to "Shortlisted" or "Rejected")
**Track before calling updateDoc:**
```typescript
const { trackAction } = useTrackAction({ module: 'nominations' });

await trackAction(
  'CHANGED_NOMINATION_STATUS',
  `Changed ${nomineeNa me} from ${currentStatus} to ${newStatus}`,
  nominationId,
  { 
    previousStatus: currentStatus, 
    newStatus: newStatus,
    categoryId: nomination.categoryId,
    nomineeName: nomineeNa me 
  }
);
```

#### 4. View Nomination Detail
**Location:** Line ~1900 (when opening a nomination card)
**Track:**
```typescript
useTrackInteraction({
  module: 'nominations',
  action: 'VIEWED_NOMINATION_DETAIL',
  description: `Viewed nomination for ${nomineeName}`,
  resourceId: nominationId,
  trackImmediately: true,
});
```

#### 5. Judge Activity View
**Location:** activeSection === "judges" (~Line 2400)
**Track:**
```typescript
useTrackInteraction({
  module: 'judge_scores',
  action: 'VIEWED_JUDGE_ACTIVITY',
  description: `Viewed judge activity: ${judgeCount} judge(s) with ${totalScores} score(s)`,
  trackImmediately: true,
});
```

#### 6. Categories Management
**Location:** activeSection === "categories" (~Line 2500)
**Track on category add/update/delete:**
```typescript
const { trackAction } = useTrackAction({ module: 'settings' });

// Add category
await trackAction(
  'MANAGED_CATEGORIES',
  `Added new category: ${categoryName}`,
  categoryId,
  { action: 'create', categoryName }
);

// Update category
await trackAction(
  'MANAGED_CATEGORIES',
  `Updated category: ${categoryName}`,
  categoryId,
  { action: 'update', categoryName }
);

// Delete category
await trackAction(
  'MANAGED_CATEGORIES',
  `Deleted category: ${categoryName}`,
  categoryId,
  { action: 'delete', categoryName }
);
```

#### 7. Winners Management
**Location:** activeSection === "winners" (~Line 2600)
**Track:**
```typescript
const { trackAction } = useTrackAction({ module: 'settings' });

await trackAction(
  'MANAGED_WINNERS',
  `Updated winners for ${categoryName}`,
  null,
  { categoryId, winnerCount, action: 'update_winners' }
);
```

#### 8. Reminder Emails
**Location:** Line ~2300 (send-reminders button)
**Track:**
```typescript
const { trackAction } = useTrackAction({ module: 'communications' });

await trackAction(
  'SENT_REMINDER_EMAIL',
  `Sent reminders to ${incompleteCount} nominators`,
  null,
  { 
    recipientCount: incompleteCount,
    emailType: 'incomplete_nominations',
    status: success ? 'success' : 'failure'
  }
);
```

#### 9. Leaderboard View
**Location:** activeSection === "leaderboard"
**Track:**
```typescript
useTrackInteraction({
  module: 'leaderboard',
  action: 'VIEWED_LEADERBOARD',
  description: 'Admin viewed leaderboard rankings',
  trackImmediately: true,
});
```

#### 10. Create Accounts
**Location:** activeSection === "accounts"
**Track:**
```typescript
const { trackAction } = useTrackAction({ module: 'settings' });

await trackAction(
  'CREATED_ACCOUNT',
  `Created account for ${userEmail} (${userRole})`,
  userId,
  { userEmail, userRole, accountType: 'judge_or_admin' }
);
```

#### 11. Settings Access
**Location:** activeSection === "settings" (already tracked in AdminSettings.tsx)
**Confirmed:** ✅ Already tracked with `ACCESSED_SETTINGS`

#### 12. Audit Logs Export
**Location:** AdminSettings.tsx (already added export buttons)
**Track export actions:**
```typescript
const { trackAction } = useTrackAction({ module: 'settings' });

// When exporting
await trackAction(
  'EXPORTED_DATA',
  `Exported ${logCount} ${roleType} audit logs as ${format}`,
  null,
  { 
    logCount, 
    roleType: 'admin' | 'judge',
    format: 'csv' | 'pdf',
    moduleFilter: selectedModule
  }
);
```

---

## Judge Panel Integration Points

### src/routes/judge.tsx

#### 1. View Shortlisted Nominations
**Location:** Component mount or tab select
**Track:**
```typescript
useTrackInteraction({
  module: 'judge_scoring',
  action: 'VIEWED_SHORTLISTED',
  description: `Viewed ${nominationCount} shortlisted nominations`,
  trackImmediately: true,
});
```

#### 2. View Nomination for Scoring
**Location:** When opening a nomination card for scoring
**Track:**
```typescript
useTrackInteraction({
  module: 'judge_scoring',
  action: 'VIEWED_NOMINATION_FOR_SCORING',
  description: `Viewing nomination: ${nomineeName} in ${categoryName}`,
  resourceId: nominationId,
  trackImmediately: true,
});
```

#### 3. Submit Score
**Location:** When judge clicks "Submit Score" or "Update Score"
**Track:**
```typescript
const { trackAction } = useTrackAction({ module: 'judge_scoring' });

await trackAction(
  'SUBMITTED_SCORE',
  `Scored ${nomineeName} (${categoryName}): ${stars}/5 stars`,
  nominationId,
  { 
    score: stars,
    maxScore: 5,
    categoryId,
    nomineeName
  }
);
```

#### 4. View Own Scores
**Location:** Judge views their submitted scores
**Track:**
```typescript
useTrackInteraction({
  module: 'judge_scoring',
  action: 'VIEWED_OWN_SCORES',
  description: `Viewed own scores: ${scoreCount} submitted`,
  trackImmediately: true,
});
```

#### 5. View Leaderboard
**Location:** Judge visits leaderboard
**Track:**
```typescript
useTrackInteraction({
  module: 'leaderboard',
  action: 'VIEWED_LEADERBOARD',
  description: 'Judge viewed live leaderboard rankings',
  trackImmediately: true,
});
```

#### 6. Access Judge Guide
**Location:** When judge opens guide/help
**Track:**
```typescript
useTrackInteraction({
  module: 'documentation',
  action: 'ACCESSED_JUDGE_GUIDE',
  description: 'Accessed judge scoring guide',
  trackImmediately: true,
});
```

---

## Action Type Reference

### Admin-Only Actions
```typescript
'VIEWED_NOMINATIONS' | 'VIEWED_NOMINATION_DETAIL' | 'FILTERED_NOMINATIONS' |
'SEARCHED_NOMINATIONS' | 'VIEWED_JUDGE_ACTIVITY' | 'ACCESSED_SETTINGS' |
'VIEWED_AUDIT_LOGS' | 'EXPORTED_DATA' | 'CHANGED_NOMINATION_STATUS' |
'SENT_REMINDER_EMAIL' | 'MANAGED_CATEGORIES' | 'MANAGED_WINNERS' |
'CREATED_ACCOUNT'
```

### Judge-Only Actions
```typescript
'VIEWED_SHORTLISTED' | 'VIEWED_NOMINATION_FOR_SCORING' | 'SUBMITTED_SCORE' |
'VIEWED_OWN_SCORES' | 'ACCESSED_JUDGE_GUIDE'
```

### Shared Actions
```typescript
'VIEWED_LEADERBOARD'
```

---

## Module Reference

| Module | Purpose |
|--------|---------|
| `nominations` | Nomination viewing, filtering, searching |
| `judge_scores` | Judge activity and score tracking |
| `judge_scoring` | Judge scoring actions |
| `settings` | Admin settings, categories, winners, accounts |
| `communications` | Email reminders, notifications |
| `leaderboard` | Leaderboard viewing |
| `documentation` | Help, guides, FAQs |

---

## Database Structure

All tracking goes to Firestore collection: `audit_logs_extended`

```typescript
interface AuditLog {
  userRole: 'admin' | 'judge';
  action: string; // From AdminModuleAction or JudgeModuleAction
  module: string; // From module reference above
  sessionId: string; // Auto-generated, groups related actions
  userEmail: string; // Current user's email
  timestamp: ServerTimestamp;
  description: string; // Human-readable action description
  affectedResourceId?: string; // ID of affected nomination/category/etc
  metadata?: {
    [key: string]: any; // Module-specific data
  };
  status: 'success' | 'failure';
}
```

---

## Implementation Checklist

- [ ] Add tracking to admin nominations view
- [ ] Add tracking to filter/search handlers
- [ ] Add tracking to status change buttons
- [ ] Add tracking to judge activity view
- [ ] Add tracking to categories management
- [ ] Add tracking to winners management
- [ ] Add tracking to reminder email sending
- [ ] Add tracking to judge nomination scoring
- [ ] Add tracking to score submission
- [ ] Add tracking to leaderboard views
- [ ] Test all tracking in Settings panel
- [ ] Test Excel/PDF exports
- [ ] Verify role-based segregation works

---

## Testing Export Functionality

1. Open **Admin → Settings**
2. View **Admin Logs** tab
3. Click **"Export CSV"** or **"Export PDF"** button
4. Verify file downloads with format: `audit-logs-admin-YYYY-MM-DD.csv/pdf`
5. Repeat for **Judge Logs** tab
6. Verify timestamps, user emails, actions are correct
7. Test module filtering to export specific module logs only

---

## Error Handling

All tracking is wrapped in try-catch and won't break the application if logging fails:

```typescript
try {
  await trackAction(
    'SOME_ACTION',
    'description',
    resourceId,
    metadata
  );
} catch (error) {
  // Silently fail - application continues normally
  console.warn('[Audit] Failed to track action:', error);
}
```

---

## Real-Time Monitoring

Admins can monitor all activity in real-time by:
1. Opening Admin → Settings → Audit Logs
2. Logs auto-refresh every time the page is accessed
3. Module filter allows focusing on specific areas
4. Status indicators (✓ Success / ✗ Failed) show action outcomes
5. Segregated tabs keep admin and judge activities separate

---

## Next Steps After Implementation

1. **Integration Testing** - Run existing test suite to ensure no breaking changes
2. **User Acceptance Testing (UAT)** - Verify tracking captures actual user workflows
3. **Performance Monitoring** - Check that logging doesn't impact response times
4. **Data Retention Policy** - Document how long logs are retained in Firestore
5. **Access Control** - Ensure only admins can view audit logs
6. **Compliance Review** - Validate logs meet institutional requirements
