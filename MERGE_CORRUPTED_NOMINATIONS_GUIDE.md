# Merge Corrupted Nomination Files to Clean Entry

## Problem
The corrupted `[object Object]` entry actually has files that need to be preserved and merged into Yonwaba's complete/correct entry.

**Example:**
- ❌ Corrupted doc (has files, but missing other data)
- ✅ Clean doc (complete, but missing those files)
- **Goal:** Move files from corrupted → clean, then delete corrupted

---

## Solution

### Smart Merge Function (Automated)

A new Netlify function automatically:
1. ✅ Finds corrupted nominations
2. ✅ Finds matching clean version (same email + category)
3. ✅ Merges file uploads from corrupted → clean
4. ✅ Updates clean document with all files
5. ✅ Deletes corrupted document

---

## How to Use

### Step 1: Preview What Will Be Merged (Safe - Read Only)

Run this in your browser console while logged into admin panel:

```javascript
console.log('🔍 Analyzing corrupted nominations for file merges...');
fetch('https://salea2026.netlify.app/.netlify/functions/merge-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'report',      // Just report, don't change anything
    dryRun: true 
  })
})
.then(r => r.json())
.then(data => {
  console.log('📊 Merge Preview:', data);
  console.table(data.merges);
  console.log(`\n✓ Would merge ${data.summary.totalFilesMerged} files`);
  console.log(`✓ Would clean up ${data.merges.length} corrupted records`);
});
```

**Expected Output:**
```
Merge Preview:
merges: [
  {
    corruptedId: "nom_abc123",
    cleanId: "nom_def456",
    filesMerged: 5,
    uploadsMerged: { q2: 3, q4: 2 },
    status: "would_merge",
    message: "DRY RUN: Would merge 5 files and delete corrupted doc"
  }
]
summary: {
  corruptedFound: 1,
  cleanFound: 9,
  mergesPerformed: 1,
  totalFilesMerged: 5,
  dryRun: true
}
```

### Step 2: Actually Perform the Merge (Permanent!)

Once you've verified the dry run looks good, run this:

```javascript
console.log('🔄 MERGING files from corrupted to clean nominations...');
fetch('https://salea2026.netlify.app/.netlify/functions/merge-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'merge',       // Actually perform the merge
    dryRun: false          // Not a simulation
  })
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    console.log('✅ MERGE COMPLETE!');
    console.table(data.merges);
    console.log(`\n✓ Merged ${data.summary.totalFilesMerged} files`);
    console.log(`✓ Cleaned up ${data.merges.length} corrupted records`);
    console.log('\n➡️ Refresh your admin panel to see the result!');
  } else {
    console.log('❌ Error:', data.error);
  }
});
```

**Expected Output:**
```
✅ MERGE COMPLETE!
merges: [
  {
    corruptedId: "nom_abc123",
    cleanId: "nom_def456",
    filesMerged: 5,
    uploadsMerged: { q2: 3, q4: 2 },
    status: "merged",
    message: "✅ Merged 5 files and deleted corrupted doc"
  }
]
summary: {
  corruptedFound: 1,
  cleanFound: 9,
  mergesPerformed: 1,
  totalFilesMerged: 5,
  dryRun: false
}

Refresh your admin panel to see the result!
```

### Step 3: Verify in Admin Panel

1. Refresh your admin panel
2. Look for Yonwaba's nomination
3. Should now show **all files** (merged from corrupted entry)
4. `[object Object]` entry should be gone ✅

---

## What Gets Merged

### Files Merged:
- All uploads from corrupted document
- Added to corresponding questions in clean document
- Duplicates automatically skipped (by filename)

### Metadata Updated:
- `uploads` — merged file structure
- `mergedAt` — timestamp of merge operation
- `mergedFrom` — reference to corrupted document ID

### What's NOT Changed:
- Nominee name, email, answers (all stay in clean document)
- All other fields (categories, status, etc.)
- Judge scores (if any)

---

## Example: Your Yonwaba Case

### Before Merge:
```
Document 1 (corrupted):
- nomineeName: [object Object]
- nomineeEmail: null
- uploads: { q2: [file1, file2], q4: [file3] }
- status: "pending"

Document 2 (clean):
- nomineeName: "Yonwaba"
- nomineeEmail: "yonwaba@dut4life.ac.za"
- uploads: { q1: [file_a], q3: [file_b] }
- status: "pending"
```

### After Merge:
```
Document 2 (now complete):
- nomineeName: "Yonwaba"
- nomineeEmail: "yonwaba@dut4life.ac.za"
- uploads: {
    q1: [file_a],              // From clean
    q2: [file1, file2],        // From corrupted
    q3: [file_b],              // From clean
    q4: [file3]                // From corrupted
  }
- mergedAt: 2026-07-07T14:30:00Z
- mergedFrom: "nom_abc123"
- status: "pending"

Document 1 (corrupted):
❌ DELETED
```

---

## Step-by-Step Summary

| Step | Action | Command | Result |
|------|--------|---------|--------|
| 1 | Preview merge | `action: "report", dryRun: true` | See what files will be merged (safe) |
| 2 | Perform merge | `action: "merge", dryRun: false` | Merge files + delete corrupted |
| 3 | Verify | Refresh admin | Check all files are in correct entry |

---

## How It Handles Edge Cases

### Multiple Corrupted Entries for Same Nominee?
✅ Automatically matches each by email + category  
✅ Merges all their files together  
✅ Deletes all corrupted versions

### No Matching Clean Entry?
✅ Orphaned corrupted doc is deleted (no files to save)

### Files with Same Name?
✅ Duplicates automatically skipped  
✅ Only unique files merged

### Different Questions (q1, q2, q3, q4)?
✅ Smart enough to match question IDs  
✅ Merges files to correct questions

---

## Browser Console Commands (Quick Copy-Paste)

### Full workflow in one code block:

```javascript
// 1. Preview (safe)
console.log('Step 1: Previewing merges...');
const previewResult = await fetch('https://salea2026.netlify.app/.netlify/functions/merge-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'report', dryRun: true })
}).then(r => r.json());

console.log('Preview Result:', previewResult);
console.log(`\n✓ Ready to merge ${previewResult.summary.totalFilesMerged} files?`);
console.log('  Run Step 2 below if yes...\n');

// 2. Merge (after reviewing preview!)
console.log('Step 2: Performing merge...');
const mergeResult = await fetch('https://salea2026.netlify.app/.netlify/functions/merge-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'merge', dryRun: false })
}).then(r => r.json());

if (mergeResult.success) {
  console.log('✅ SUCCESS!');
  console.log(`Merged ${mergeResult.summary.totalFilesMerged} files`);
  console.log('Refresh your admin panel now!');
} else {
  console.log('❌ Error:', mergeResult);
}
```

---

## Troubleshooting

### Error: "FIREBASE_ADMIN_SDK_B64 not set"
The Netlify function needs Firebase admin credentials.  
**Solution:** Make sure environment variables are set on Netlify

### No merges found
Good news! Either:
- ✅ No corrupted nominations exist (system is clean!)
- ✅ All corrupted docs already have matching clean versions with all files

### Error during merge
- Review preview output first (Step 1)
- Check that email addresses match exactly
- Try again or contact support

---

## Post-Merge Verification

✅ **Check in Admin Panel:**
- Navigate to Nominations
- Find Yonwaba entry
- Should show all 12+ files (merged from both docs)
- No `[object Object]` entry visible
- Complete data showing

✅ **Check Document Details:**
- Click "View details" on Yonwaba
- All sections populated
- All files accessible
- No errors or missing data

✅ **Check Firestore Console:**
- Open Firebase Console → Firestore
- Find the Yonwaba nomination document
- Should see:
  - `mergedAt` field with timestamp
  - `mergedFrom` field with corrupted doc ID
  - `uploads` with all files from both docs

---

## Summary

**Your Yonwaba Case:**
1. Run Step 1 command → See 5 files ready to merge
2. Review output → Looks good
3. Run Step 2 command → Merge completes
4. Refresh admin → 1 complete Yonwaba entry with all files ✓

**Result:**
- ✅ All files preserved
- ✅ Clean data retained
- ✅ Corrupted entry removed
- ✅ Single source of truth

Ready? Start with Step 1 command above! 👆
