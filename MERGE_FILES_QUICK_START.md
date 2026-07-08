# 🚀 Merge Files from Corrupted to Clean Nomination - QUICK START

## Your Situation
- ❌ Corrupted entry: Has **files** but broken data (`[object Object]`)
- ✅ Clean entry: Has proper data but **missing those files**
- **Goal:** Merge files → clean entry → delete corrupted

---

## Run This Now (Copy-Paste to Browser Console)

**Step 1: Preview (See what will be merged) — SAFE**

```javascript
fetch('https://salea2026.netlify.app/.netlify/functions/merge-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'report', dryRun: true })
}).then(r => r.json()).then(d => {
  console.log('📊 Preview:', d);
  console.log(`✓ Ready to merge ${d.summary.totalFilesMerged} files`);
});
```

Expected: Shows list of files that will be merged from corrupted → clean

---

**Step 2: Actually Merge (Only if Step 1 looks good) — PERMANENT**

```javascript
fetch('https://salea2026.netlify.app/.netlify/functions/merge-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'merge', dryRun: false })
}).then(r => r.json()).then(d => {
  if (d.success) {
    console.log('✅ SUCCESS! Merged:', d.summary);
    alert('✓ Files merged! Refresh admin panel now');
  } else {
    console.log('❌ Error:', d);
  }
});
```

Expected: `✅ SUCCESS! Merged X files from Y corrupted records`

---

**Step 3: Refresh & Verify**

1. Refresh admin panel
2. Look for Yonwaba
3. Should show **all files** (merged from corrupted entry)
4. `[object Object]` entry should be gone ✓

---

## What Happens

| Before | After |
|--------|-------|
| 2 Yonwaba entries | 1 Yonwaba entry |
| Entry 1: data broken, has files | Entry 1: Complete with ALL files ✓ |
| Entry 2: data good, missing files | Entry 2: Deleted |

---

## Full Details

See: **MERGE_CORRUPTED_NOMINATIONS_GUIDE.md** (100+ lines with edge cases, troubleshooting, etc.)

---

## TL;DR

1. Paste Step 1 code → review output
2. Paste Step 2 code → confirm merge
3. Refresh admin panel → done! ✅

Let's go! 👉
