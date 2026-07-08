# Yonwaba Duplicate Fix - Quick Action Guide

## ⚡ What You're Seeing

Your admin panel shows:
1. ✅ **Yonwaba** (Student Entrepreneurship Award) - 12 files, complete data
2. ❌ **[object Object]** (Student Entrepreneurship Award) - corrupted, no data

This happened because a reminder email was sent and Yonwaba re-submitted their nomination, creating a duplicate (which corrupted). **My fix prevents this going forward.**

---

## 🧹 Clean Up the Corrupted Entry Now

### Option 1: Manual Cleanup via Firestore Console (Safest for First Time)

**Step 1:** Go to [Firebase Console](https://console.firebase.google.com)

**Step 2:** Select your project → Firestore Database

**Step 3:** Open `nominations` collection

**Step 4:** Look for documents with:
- Category: "Student Entrepreneurship Award"  
- Data: Contains `[object Object]`

**Step 5:** For Yonwaba:
- ✅ Verify the complete one has all 12 files and complete data
- ✅ Click the corrupted one and delete it
- ✅ Refresh your admin panel - should show only 1 Yonwaba entry now

---

### Option 2: API Cleanup (Automated)

Run this in your browser console while logged into the admin panel:

```javascript
// Step 1: See what's corrupted (safe)
console.log('🔍 Finding corrupted nominations...');
fetch('https://salea2026.netlify.app/.netlify/functions/cleanup-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'list', dryRun: true })
})
.then(r => r.json())
.then(data => {
  console.log('Found corrupted nominations:', data.corrupted);
  console.log(JSON.stringify(data.corrupted, null, 2));
});
```

Look at the output. Should show 1 corrupted nomination for Yonwaba.

Then run this to **dry run** delete (shows what would happen):

```javascript
// Step 2: Dry run (see what would be deleted - no actual deletion)
console.log('🧹 Dry run cleanup (checking what would be deleted)...');
fetch('https://salea2026.netlify.app/.netlify/functions/cleanup-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'delete', dryRun: true })
})
.then(r => r.json())
.then(data => {
  console.log('WOULD DELETE:', data);
  console.log(`✓ Safe to delete: ${data.corrupted.length} corrupted record(s)`);
});
```

Finally, if the dry run looks good, run this to **actually** delete:

```javascript
// Step 3: ACTUALLY DELETE (permanent!)
console.log('🗑️ PERMANENTLY deleting corrupted nominations...');
fetch('https://salea2026.netlify.app/.netlify/functions/cleanup-corrupted-nominations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'delete', dryRun: false })
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    console.log('✅ SUCCESS! Deleted:', data.deleted);
    console.log('Please refresh your admin panel to see the change.');
  } else {
    console.log('❌ Error:', data);
  }
});
```

Then refresh your admin panel. The `[object Object]` entry should be gone! ✨

---

## ✅ Verification

After cleanup:

1. **Admin Panel → Nominations**
2. **Filter: Student Entrepreneurship Award**
3. **Look for Yonwaba**
4. Should see: **1 entry** (not 2!)
5. Entry shows: All 12 files, complete data

---

## 🛡️ Why This Won't Happen Again

The merge fix I implemented earlier does this automatically:

**Before fix (OLD - BROKEN):**
```
User submits → System creates NEW nomination
(later)
User re-submits after reminder → System creates ANOTHER NEW nomination ❌ DUPLICATE!
```

**After fix (NEW - FIXED):**
```
User submits → System creates nomination
(later)
User re-submits after reminder → System FINDS existing + UPDATES it ✅ NO DUPLICATE!
```

---

## 📖 Full Documentation

For detailed explanations, see:
- `NOMINATION_MERGE_FIX.md` - How the fix works
- `CLEANUP_CORRUPTED_NOMINATIONS.md` - Detailed cleanup guide

---

## 🚀 Quick Reference

| Task | Command/Location |
|------|------------------|
| View corrupted | Firebase Console → nominations collection, or run Option 2 Step 1 |
| Dry run cleanup | Run Option 2 Step 2 (safe, shows what would happen) |
| Actually cleanup | Run Option 2 Step 3 (permanent deletion) |
| Check result | Refresh admin panel, should show 1 Yonwaba entry |

---

## 💡 Summary

✅ **Fix implemented:** Nominations no longer create duplicates  
✅ **Cleanup tool ready:** One corrupted entry needs manual cleanup (Yonwaba)  
✅ **Easy cleanup:** 3 steps via browser console or Firebase console  
✅ **No data loss:** Complete Yonwaba entry preserved, only corrupted one deleted  

**Next:** Choose Option 1 or 2 above and clean up! Should take 2 minutes. 👍
