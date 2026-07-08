# Converting HTML Results to PDF

## 📋 Files Generated

Three files have been created with the password reset links:

1. **HTML** (recommended for PDF): `scripts/bulk-create-results-2026-07-07T17-55-30.html`
2. **JSON** (for programmatic use): `scripts/bulk-create-results-2026-07-07T17-55-30.json`
3. **Markdown** (for reference): `scripts/bulk-create-results-2026-07-07T17-55-30.md`

---

## 🔄 Converting HTML to PDF

### Option 1: Using Your Browser (Easiest)

1. **Open the HTML file** (it should already be open in your browser)
2. **Print the page**:
   - Press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
   - Or go to **File → Print**
3. **Save as PDF**:
   - Change printer to "Print to File" or "Save as PDF"
   - Click **Save**
   - Name it: `DUT-Excellence-Awards-User-Setup.pdf`

### Option 2: Using a PDF Tool

If your browser's print-to-PDF doesn't work well:

1. Download a free online converter like:
   - [HTML2PDF](https://html2pdf.com)
   - [CloudConvert](https://cloudconvert.com)
   - [Smallpdf](https://smallpdf.com)

2. Upload the HTML file and download as PDF

### Option 3: Using Command Line (Advanced)

If you have `wkhtmltopdf` installed:
```bash
wkhtmltopdf scripts/bulk-create-results-2026-07-07T17-55-30.html DUT-Excellence-Awards-User-Setup.pdf
```

---

## 📧 What to Share with Users

### For All Users:
1. **Open the PDF** you generated
2. **Find your name and email** in the document
3. **Copy your password reset link** (the long URL)
4. **Paste it in your browser** or click if available

### For Each User:

Each card contains:
- ✅ Their name
- ✅ Their email
- ✅ Their role (ADMIN or JUDGE)
- ✅ Their unique password reset link
- ✅ Step-by-step instructions

---

## 📝 Step-by-Step for Users

When they receive the PDF/link:

1. **Click the password reset link**
2. **Set your password**:
   - Make it strong (min 8 characters, mix of upper/lower/numbers/symbols)
   - Remember it or save it securely
3. **Log in** to the system:
   - Email: (their DUT email)
   - Password: (the one they just set)
4. **Complete their profile** in the admin dashboard

---

## ⏰ Important: Links Expire in 1 Hour

⚠️ **CRITICAL**: Password reset links are valid for **1 hour only**

- Tell users to use the link **immediately** or request a new one
- To request new link: Contact admin for a new password reset email

### To Generate a New Link (if link expires):

1. Go to [Firebase Console](https://console.firebase.google.com)
2. **Authentication** → **Users**
3. Find the user
4. Click the three-dot menu
5. Click **Reset password**
6. Firebase will email them a new link

---

## 🔐 Security Notes for Distribution

**Safe to share in:**
- ✅ PDF via email (encrypted email preferred)
- ✅ Printed documents
- ✅ Secure messaging
- ✅ Admin dashboard (if you have user list feature)

**NOT safe to share in:**
- ❌ Unencrypted email (if sensitive)
- ❌ Group chats (use individual messages)
- ❌ Public documents

**Important**: 
- Links are unique and time-limited
- Each person needs only their own link
- No passwords are shared in the email (only the reset link)

---

## ✅ Verification Checklist

Before sharing with users:

- [ ] PDF has been saved and named clearly
- [ ] All 11 user cards are visible in the PDF
- [ ] Each card shows: Name, Email, Role, Reset Link, Instructions
- [ ] Links are formatted clearly (not broken across lines badly)
- [ ] You've tested one link yourself (optional but recommended)

---

## 🧪 Test One Link First (Optional)

To verify everything works:

1. Open one password reset link from the PDF
2. Try setting a password
3. Try logging in with that email + new password
4. Verify you see the admin/judge dashboard

Once verified, you can confidently share with all other users.

---

## 📋 User Distribution Checklist

When sending to users:

1. **Email subject**: "DUT Excellence Awards System - Account Setup"
2. **Email body**:
   ```
   Dear [Name],
   
   Your account has been created in the DUT Excellence Awards System.
   
   Please see the attached PDF for your unique password reset link.
   
   Steps:
   1. Open the PDF
   2. Find your name
   3. Click your password reset link
   4. Set your password
   5. Log in to the system
   
   Important: Link expires in 1 hour!
   
   If you have questions, contact: awards@dut.ac.za
   ```

3. **Attach**: `DUT-Excellence-Awards-User-Setup.pdf`
4. **Send individually** or as a group email with individual PDFs

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| PDF won't save from browser | Use "Save Page As" or try a different browser |
| Links not clickable in PDF | Copy-paste the link into browser manually |
| User can't click link | Try opening in different PDF viewer (Adobe, Chrome) |
| Link expired | Generate new one from Firebase Console |
| Password reset fails | Check Firebase Authentication is enabled |

---

## 📞 User Support Message

Include this in your email to users:

> **Password Reset Link Not Working?**
> 1. Check the link hasn't expired (1 hour limit)
> 2. Make sure you're copying the full link
> 3. Try in an incognito/private browser window
> 4. If still stuck, contact: support@dut.ac.za

---

## Next Steps

1. ✅ Save the HTML as PDF (using your browser's Print function)
2. ✅ Review the PDF and verify all users are listed
3. ✅ Optionally test one link
4. ✅ Send PDF to users with instructions
5. ✅ Users set their passwords and log in
6. ✅ System is ready to go!

