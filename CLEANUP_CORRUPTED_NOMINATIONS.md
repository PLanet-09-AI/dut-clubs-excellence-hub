# Corrupted Nomination Cleanup Guide

## Problem
When users re-submit nominations after receiving reminders (before the merge fix), the system sometimes creates corrupted documents with `[object Object]` values instead of proper data.

**Example from your admin panel:**
- ✅ Yonwaba (complete, 12 files) - Good
- ❌ `[object Object]` (corrupted, no data) - Bad (this is what we need to clean up)

---

## Solution

### 1. **Identify Corrupted Nominations (Safe - Read Only)**

**Option A: Via API (Recommended)**

Make a POST request to identify corrupted records:

```bash
curl -X POST https://salea2026.netlify.app/.netlify/functions/cleanup-corrupted-nominations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list",
    "dryRun": true
  }'
```

**Response:**
```json
{
  "success": true,
  "corrupted": [
    {
      "id": "nom_abc123xyz",
      "reason": "Contains [object Object] serialization error",
      "data": {
        "nomineeName": "[object Object]",
        "nomineeEmail": null,
        "studentNumber": null,
        "categoryId": "entrepreneur",
        "categoryName": "Student Entrepreneurship Award",
        "createdAt": "2026-07-01T10:00:00Z",
        "status": "pending"
      }
    }
  ],
  "deleted": [],
  "message": "Found 1 corrupted nominations"
}
```

**Option B: Firebase Console (Manual)**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Firestore Database → `nominations` collection
4. Look for documents where:
   - `nomineeName` = `[object Object]` (red flag!)
   - `nomineeEmail` is missing
   - `studentNumber` is null/missing

---

### 2. **Verify Before Deleting**

Before cleanup, for each corrupted record:
1. ✅ Check if a **complete version** exists (same nominee + category)
2. ✅ Verify the complete version has all the data
3. ✅ Only then delete the corrupted one

**From your screenshots:**
- Yonwaba has a complete entry with all 12 files ✅
- So the corrupted `[object Object]` entry can safely be deleted ✅

---

### 3. **Delete Corrupted Nominations (Destructive)**

**⚠️ Warning: This is PERMANENT. Do DRY RUN first!**

**Step 1: DRY RUN (See what would be deleted)**

```bash
curl -X POST https://salea2026.netlify.app/.netlify/functions/cleanup-corrupted-nominations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "delete",
    "dryRun": true
  }'
```

Response: Lists what WOULD be deleted, but doesn't actually delete.

**Step 2: ACTUAL DELETION (Only if dry run looks good)**

```bash
curl -X POST https://salea2026.netlify.app/.netlify/functions/cleanup-corrupted-nominations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "delete",
    "dryRun": false
  }'
```

Response:
```json
{
  "success": true,
  "corrupted": [...],
  "deleted": ["nom_abc123xyz"],
  "message": "✅ Deleted 1 corrupted nominations"
}
```

---

## Detection Criteria (What Gets Flagged as Corrupted)

The cleanup function flags a nomination as corrupted if:

1. **Missing Required Fields:**
   - `nomineeName` is missing/empty
   - `nomineeEmail` is missing/empty
   - `studentNumber` is missing/empty
   - `categoryId` is missing/empty
   - `status` is missing/empty

2. **Serialization Errors:**
   - Any field contains `[object Object]` string
   - Fields that should be strings are objects (type mismatch)

3. **Specific Field Corruption:**
   - `nomineeName` is an object instead of string
   - `nomineeEmail` is an object instead of string
   - `studentNumber` is an object instead of string

---

## Your Specific Case: Yonwaba

### Current State:
- **Document 1 (Complete):** Yonwaba - 12 files, all data properly filled
- **Document 2 (Corrupted):** `[object Object]` - missing data

### Cleanup Steps:

1. **Verify Document 1 is complete:**
   ```
   ✅ nomineeName: "Yonwaba"
   ✅ nomineeEmail: "yonwaba@dut4life.ac.za"
   ✅ studentNumber: "22252145"
   ✅ categoryId: "entrepreneur"
   ✅ 12 files uploaded and accessible
   ✅ All answers filled out
   ```

2. **Run DRY RUN:**
   ```bash
   curl -X POST https://salea2026.netlify.app/.netlify/functions/cleanup-corrupted-nominations \
     -H "Content-Type: application/json" \
     -d '{"action": "delete", "dryRun": true}'
   ```
   
   Verify it shows the `[object Object]` document will be deleted ✅

3. **Run ACTUAL DELETE:**
   ```bash
   curl -X POST https://salea2026.netlify.app/.netlify/functions/cleanup-corrupted-nominations \
     -H "Content-Type: application/json" \
     -d '{"action": "delete", "dryRun": false}'
   ```

4. **Verify in Admin Panel:**
   - Refresh nominations list
   - Should see only **1 Yonwaba entry** now (the complete one)
   - `[object Object]` entry should be gone ✅

---

## Using from Browser Console

If you prefer using JavaScript in the browser (while logged in as admin):

```javascript
// Step 1: List corrupted (safe)
fetch('/.netlify/functions/cleanup-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'list', dryRun: true })
})
.then(r => r.json())
.then(data => console.log('Corrupted:', data.corrupted));

// Step 2: Dry run delete (shows what would be deleted)
fetch('/.netlify/functions/cleanup-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': application/json' },
  body: JSON.stringify({ action: 'delete', dryRun: true })
})
.then(r => r.json())
.then(data => console.log('Would delete:', data.message));

// Step 3: Actually delete (PERMANENT!)
fetch('/.netlify/functions/cleanup-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'delete', dryRun: false })
})
.then(r => r.json())
.then(data => console.log('Result:', data));
```

---

## After Cleanup

### What Changes:
- ✅ Admin panel shows only clean nominations
- ✅ No more `[object Object]` entries
- ✅ Accurate nomination counts
- ✅ Judge scoring works correctly
- ✅ Export functions work properly

### What Stays Same:
- ✅ All complete nominations preserved
- ✅ No data loss for valid entries
- ✅ Audit logs unaffected
- ✅ Judge scores unaffected

---

## Going Forward

**The nomination merge fix (implemented earlier) prevents future corruption because it:**

1. ✅ Checks for existing nominations before creating new
2. ✅ Updates existing instead of creating duplicates
3. ✅ Never creates `[object Object]` entries
4. ✅ Properly handles reminder re-submissions

**Future workflow:**
- User submits nomination → System creates it
- User gets reminder email
- User updates nomination → System **updates existing** (no duplicate!)
- Admin sees 1 nomination per person per category

---

## Troubleshooting

### Error: "FIREBASE_ADMIN_SDK_B64 not set"
The Netlify function needs Firebase credentials. Make sure the environment variable is set:
```bash
netlify env:set FIREBASE_ADMIN_SDK_B64 "$(cat path/to/serviceAccount.json | base64 -w 0)"
```

### Error: "Permission denied"
Make sure:
1. You're logged in as admin
2. Your Firebase rules allow the cleanup function to access Firestore
3. The service account has write permissions

### No corrupted documents found
✅ Great! Your system is clean. The merge fix is working.

### Many corrupted documents found
1. Run DRY RUN first to see what would be deleted
2. Review each one to confirm it's safe to delete
3. Make sure complete versions exist for each nominee
4. Then proceed with actual delete

---

## Summary

| Step | Action | Risk | Command |
|------|--------|------|---------|
| 1 | List corrupted | None (read-only) | `action: "list"` |
| 2 | Dry run delete | None (simulates) | `action: "delete", dryRun: true` |
| 3 | Actual delete | ⚠️ Permanent | `action: "delete", dryRun: false` |

**For your Yonwaba case:** Should be safe to delete the `[object Object]` entry since you have a complete version with all 12 files. Run dry run first to confirm, then delete.
