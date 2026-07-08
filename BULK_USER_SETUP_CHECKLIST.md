# Bulk User Creation - Setup Checklist

## ✅ What's Been Created

- [x] **Netlify Function** (`netlify/functions/bulk-create-users.mts`)
  - Creates Firebase Auth accounts for admins and judges
  - Sets role-based custom claims
  - Generates password reset links
  - Sends invitation emails

- [x] **User Data File** (`scripts/bulk-users-data.json`)
  - Contains all 4 admins and 7 judges
  - Ready to run (already populated)

- [x] **CLI Script** (`scripts/bulk-create-users.mjs`)
  - Calls the Netlify function
  - Displays results
  - Saves results to timestamped JSON file

- [x] **Documentation**
  - `BULK_USER_CREATION_GUIDE.md` - Complete usage guide
  - `EMAILJS_BULK_INVITE_SETUP.md` - Email template setup
  - `package.json` - npm script added

## 🔧 Setup Steps (You Need to Do)

### Step 1: Create EmailJS Template
**Status**: NOT YET CONFIGURED

1. Go to [emailjs.com](https://emailjs.com)
2. Log in to your dashboard
3. Go to **Email Templates**
4. Create a new template called `template_bulk_invite`
5. Follow instructions in `EMAILJS_BULK_INVITE_SETUP.md`
6. Save the template

### Step 2: Verify Environment Variables in Netlify
**Status**: NEEDS VERIFICATION

Check these are set in Netlify dashboard (Site Settings → Build & Deploy → Environment):
- ✅ `FIREBASE_ADMIN_SDK_B64` (base64 encoded service account)
- ✅ `VITE_EMAILJS_PUBLIC_KEY` (EmailJS public key)
- ✅ `EMAILJS_PRIVATE_KEY` (EmailJS private key)
- ✅ `VITE_EMAILJS_SERVICE_ID` (EmailJS service ID)
- ✅ `VITE_EMAILJS_TEMPLATE_ID` (for other templates - for reference)

### Step 3: Deploy the Netlify Function
**Status**: NEEDS DEPLOYMENT

```bash
# Option A: Deploy everything
netlify deploy

# Option B: Deploy just functions
netlify functions:build && netlify functions:deploy
```

### Step 4: Verify User Data
**Status**: READY TO GO ✅

The file `scripts/bulk-users-data.json` already contains:
- **4 Admins**: Keshan, Kholeka, Mbali, Nontuthuko
- **7 Judges**: Absolom, Bongani, Masiza, Phumlani, Sihle, S'thembile, Zwakele

## 🚀 Running the Bulk Creation

Once Steps 1-3 are complete, you can create all the accounts:

### For Local Development:
```bash
npm run create:users
```

### For Production:
```bash
NETLIFY_SITE_URL=https://your-site.netlify.app npm run create:users
```

## 📋 What Happens

When you run `npm run create:users`:

1. **11 accounts created** (4 admins + 7 judges)
2. **Roles assigned** automatically
3. **Password reset links generated** for each user
4. **Invitation emails sent** to each person
5. **Results saved** to `scripts/bulk-create-results-{timestamp}.json`

## 📧 What Users Receive

Each person will get an email with:
- Welcome message
- Their assigned role (Administrator or Judge)
- A link to set their password
- Instructions to log in

## ✨ After Completion

1. **Users log in** using their email and new password
2. **Admins** can access full admin panel (manage categories, winners, reset votes, etc.)
3. **Judges** can access voting dashboard (limited admin panel)

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "User already exists" | User is already in Firebase - safe to skip |
| "EmailJS not configured" | Check all EmailJS env vars are set in Netlify |
| Email not received | Verify template exists as `template_bulk_invite` |
| Function not found | Run `netlify deploy` to deploy the function |

See `BULK_USER_CREATION_GUIDE.md` for detailed troubleshooting.

## 🔐 Security

- ✅ Each user gets a unique password reset link
- ✅ Links expire after 1 hour
- ✅ Passwords are never transmitted in email (only reset link)
- ✅ Custom claims enforce role-based access
- ✅ Firebase Auth handles security

## 📞 Support

If you need help:
1. Check `BULK_USER_CREATION_GUIDE.md` - most common issues covered
2. Check Netlify function logs for specific errors
3. Check EmailJS dashboard for email delivery logs
4. Check Firebase Console to verify accounts were created

## Quick Command Reference

```bash
# Run the bulk creation
npm run create:users

# Deploy the function
netlify deploy

# Check results (after running)
cat scripts/bulk-create-results-*.json

# View Netlify function logs
netlify functions:logs bulk-create-users
```
