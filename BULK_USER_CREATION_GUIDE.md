# Bulk User Creation Guide

## Overview

This system allows you to create multiple admin and judge accounts at once with password reset links. Each user receives an invitation email so they can set their own passwords.

## How It Works

1. **User Data**: Admin/judge emails and names are defined in `scripts/bulk-users-data.json`
2. **Netlify Function**: `netlify/functions/bulk-create-users.mts` handles account creation
3. **Firebase**: Creates Auth accounts and sets custom role claims
4. **EmailJS**: Sends personalized invitation emails with password reset links
5. **Script**: `scripts/bulk-create-users.mjs` calls the function

## Prerequisites

Before running the bulk creation, ensure:

### 1. Firebase Admin SDK Configured
- Verify `FIREBASE_ADMIN_SDK_B64` is set in Netlify environment variables
- This should be your Firebase service account key (base64 encoded)

### 2. EmailJS Configured
- `VITE_EMAILJS_PUBLIC_KEY` - EmailJS public API key
- `EMAILJS_PRIVATE_KEY` - EmailJS private key (server-side)
- `VITE_EMAILJS_SERVICE_ID` - EmailJS service ID
- Create the `template_bulk_invite` template (see EMAILJS_BULK_INVITE_SETUP.md)

### 3. Netlify Function Deployed
The `bulk-create-users` function must be deployed to your Netlify site:
```bash
netlify deploy
# or
netlify functions:build && netlify functions:deploy
```

## User Data Format

Edit `scripts/bulk-users-data.json` with your admin and judge information:

```json
{
  "admins": [
    {
      "email": "admin@dut.ac.za",
      "displayName": "Admin Name",
      "role": "admin"
    }
  ],
  "judges": [
    {
      "email": "judge@dut.ac.za",
      "displayName": "Judge Name",
      "role": "judge"
    }
  ]
}
```

## Running the Bulk Creation

### Option 1: Local Development (Dev Server)

If your local Netlify dev server is running on `http://localhost:8888`:

```bash
npm run create:users
# or
node scripts/bulk-create-users.mjs
```

### Option 2: Against Production

To run against your deployed Netlify site:

```bash
NETLIFY_SITE_URL=https://your-site.netlify.app npm run create:users
```

### Option 3: Manual API Call

Use `curl` or Postman to call the function directly:

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/bulk-create-users \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {"email": "admin@dut.ac.za", "displayName": "Admin Name", "role": "admin"},
      {"email": "judge@dut.ac.za", "displayName": "Judge Name", "role": "judge"}
    ]
  }'
```

## What Happens When You Run It

1. ✅ **Account Created**: Firebase Auth account created for each user
2. ✅ **Role Set**: Custom claim `role: 'admin'` or `role: 'judge'` is set
3. ✅ **Reset Link Generated**: Firebase creates a password reset link
4. ✅ **Email Sent**: Invitation email sent to user with reset link
5. ✅ **Results Saved**: Results logged to `scripts/bulk-create-results-{timestamp}.json`

## Expected Response

```json
{
  "success": true,
  "created": [
    {
      "email": "admin@dut.ac.za",
      "uid": "firebase-uid-123",
      "displayName": "Admin Name",
      "role": "admin",
      "passwordResetLink": "https://..."
    }
  ],
  "errors": [
    {
      "email": "existing@dut.ac.za",
      "displayName": "Existing User",
      "error": "User already exists"
    }
  ],
  "message": "3 users created successfully, 1 error"
}
```

## User Experience

Once the script completes, each user will receive an email with:
- Welcome message
- Their role (Administrator/Judge)
- Password reset link
- Instructions to set their password

Users click the link to:
1. Create their own password
2. Log in to the system
3. Access their admin/judge dashboard

## Troubleshooting

### "User already exists"
- The email is already registered in Firebase
- Either delete the old account (in Firebase Console) or use a different email
- Or check if the user successfully created and just got an email error

### "EmailJS not configured"
- Verify all EmailJS environment variables are set in Netlify
- Check `VITE_EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, `VITE_EMAILJS_SERVICE_ID`
- Ensure `template_bulk_invite` exists in your EmailJS dashboard

### "Invalid email format"
- Check the email addresses in `bulk-users-data.json`
- Ensure they follow standard email format (e.g., `name@dut.ac.za`)

### "Connection timeout"
- Verify your Netlify function is deployed and live
- Check `NETLIFY_SITE_URL` is correct
- Try increasing timeout in the script if needed

### Email not received
- Check EmailJS dashboard for delivery logs
- Verify email service is connected and working
- Test with `EMAILJS_SETUP.md` first

## Verifying Success

### Check Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Users**
4. Verify new accounts appear with correct emails
5. Check custom claims (should show `role: 'admin'` or `role: 'judge'`)

### Check Email Logs
1. Go to EmailJS Dashboard
2. View **Logs** to see sent emails
3. Confirm all invitations were delivered

### Check Application
1. Users should be able to log in using their email
2. Admin role should have full permissions
3. Judge role should have restricted permissions

## Updating User Data

If you need to add more users later:

1. Edit `scripts/bulk-users-data.json`
2. Add new users to `admins` or `judges` array
3. Run the script again
4. New users will be created, existing users will show errors (safe to ignore)

## Resetting User Passwords

If a user loses their password later:

1. Go to Firebase Console
2. Go to **Authentication** → **Users**
3. Find the user
4. Click the **Reset password** icon
5. Firebase will email them a reset link (automatic)

Or programmatically (if you add a feature):
```javascript
import { sendPasswordResetEmail } from '@/lib/auth-firebase';
await sendPasswordResetEmail('user@dut.ac.za');
```

## Removing Users

If you need to remove a user:

1. Go to Firebase Console
2. Find the user in **Authentication**
3. Click the three-dot menu
4. Click **Delete user**

## Security Notes

- ✅ Passwords are generated securely at Firebase
- ✅ Each user gets a unique reset link
- ✅ Reset links expire after 1 hour
- ✅ Custom claims set role-based access control
- ✅ Admins have full platform permissions
- ✅ Judges have restricted voting-only permissions

## Script Files Reference

| File | Purpose |
|------|---------|
| `netlify/functions/bulk-create-users.mts` | Netlify function that creates accounts |
| `scripts/bulk-create-users.mjs` | CLI script to call the function |
| `scripts/bulk-users-data.json` | User data (admins and judges) |
| `scripts/bulk-create-results-*.json` | Results from each run (timestamped) |

## npm Scripts

Add this to your `package.json` if not already present:

```json
{
  "scripts": {
    "create:users": "node scripts/bulk-create-users.mjs"
  }
}
```

Then run:
```bash
npm run create:users
```

## Next Steps

1. ✅ Review and update `scripts/bulk-users-data.json`
2. ✅ Create EmailJS template `template_bulk_invite` (see EMAILJS_BULK_INVITE_SETUP.md)
3. ✅ Deploy the Netlify function: `netlify deploy`
4. ✅ Set environment variables in Netlify dashboard
5. ✅ Run the script: `npm run create:users`
6. ✅ Verify results in Firebase Console and user emails
