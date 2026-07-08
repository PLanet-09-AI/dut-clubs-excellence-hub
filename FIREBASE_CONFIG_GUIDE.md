# Firebase Configuration for Bulk User Creation

## What You Need to Configure in Firebase

Before running the bulk user creation, you need to set up the Firebase Admin SDK and enable password reset emails. Here's exactly what to do:

---

## Step 1: Get Your Firebase Admin SDK Key

### 1.1 Go to Firebase Console
1. Open [https://console.firebase.google.com](https://console.firebase.google.com)
2. Select your project: **student-services-745d5**
3. Click the ⚙️ (Settings icon) in top-left
4. Go to **Project Settings**

### 1.2 Create a Service Account Key
1. Go to **Service Accounts** tab
2. Click **Generate New Private Key**
3. A JSON file will download - keep this safe!

### 1.3 Encode the Service Account Key
You need to encode this JSON as base64 for Netlify:

**On Windows (PowerShell):**
```powershell
# Read the JSON file
$content = Get-Content "path/to/student-services-745d5-firebase-adminsdk-*.json" -Raw

# Encode to base64
$base64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content))

# Copy to clipboard
$base64 | Set-Clipboard

# Paste it into Netlify environment variable
echo "Copied to clipboard - paste in Netlify as FIREBASE_ADMIN_SDK_B64"
```

**On Mac/Linux:**
```bash
# Encode the service account JSON
cat path/to/service-account-key.json | base64

# Copy the output and paste into Netlify
```

### 1.4 Set in Netlify
1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Select your site
3. Go to **Site Settings** → **Build & Deploy** → **Environment**
4. Click **Edit variables**
5. Add new variable:
   - **Key**: `FIREBASE_ADMIN_SDK_B64`
   - **Value**: (paste the base64 string)
6. Click **Save**

---

## Step 2: Configure Firebase Authentication Settings

### 2.1 Enable Email/Password Authentication
1. In Firebase Console, go to **Authentication**
2. Click **Sign-in method** tab
3. Verify **Email/Password** is enabled (should have a toggle)
4. If not enabled, click the **Email/Password** option and enable it

### 2.2 Configure Password Reset Email Template
1. In **Authentication**, go to **Templates** tab
2. Look for **Password reset** template
3. Click the pencil icon to edit
4. Customize if needed (or leave default)
5. This is what users will receive in their email

### 2.3 Set Custom Claims Security Rules (Optional but Recommended)
This restricts admin operations to users with `role: 'admin'` custom claim.

**Go to Firestore → Rules tab and update:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read public data
    match /public/{document=**} {
      allow read: if request.auth != null;
    }

    // Admin-only operations
    match /admin/{document=**} {
      allow read, write: if request.auth != null && request.auth.token.role == 'admin';
    }

    // Judge operations (voting)
    match /judge_scores/{document=**} {
      allow read, write: if request.auth != null && (request.auth.token.role == 'admin' || request.auth.token.role == 'judge');
    }

    // Default: deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Step 3: Verify Your Netlify Environment Variables

Go to your Netlify site settings and verify ALL these are set:

| Variable | Where to Get It |
|----------|-----------------|
| `FIREBASE_ADMIN_SDK_B64` | Step 1 above (Firebase console) |
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings (already set?) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console → Project Settings (already set?) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console → Project Settings (should be `student-services-745d5`) |
| `VITE_EMAILJS_PUBLIC_KEY` | EmailJS Dashboard → Account → API Keys |
| `EMAILJS_PRIVATE_KEY` | EmailJS Dashboard → Account → API Keys (private) |
| `VITE_EMAILJS_SERVICE_ID` | EmailJS Dashboard → Email Services |

**To find Firebase config:**
1. Go to Firebase Console
2. Go to **Project Settings** (gear icon)
3. Scroll down to "Your apps"
4. Find your web app and copy the config values

---

## Step 4: Test Custom Claims Are Working

After a user is created, verify their custom claim is set:

### 4.1 In Firebase Console
1. Go to **Authentication** → **Users**
2. Find the newly created user
3. Click on their email
4. Scroll down to **Custom claims**
5. Should show: `{ "role": "admin" }` or `{ "role": "judge" }`

### 4.2 In Your Application Code
Users can check their own role:
```typescript
// In your app, users can get their role
const idTokenResult = await auth.currentUser?.getIdTokenResult(true);
const userRole = idTokenResult?.claims?.role; // "admin" or "judge"
console.log('My role:', userRole); // Should be "admin" or "judge"
```

---

## Step 5: Test the Password Reset Email

Once you run the bulk creation:

1. ✅ Check your email (ndumisobuthelezi028@gmail.com)
2. ✅ You should receive an invitation email
3. ✅ Email should contain a password reset link
4. ✅ Click the link to set your password
5. ✅ You should be able to log in

---

## Step 6: Verify Firebase Settings After First Test

After creating your test account, check Firebase Console:

### 6.1 Authentication Tab
- [ ] Your email appears in the users list
- [ ] Account shows as "Email/Password" auth provider
- [ ] Custom claim shows `role: admin`

### 6.2 Custom Claims Tab
- [ ] Click your user
- [ ] Custom claims should show: `{ "role": "admin" }`

### 6.3 Firestore Tab (if using Firestore collections)
- [ ] Any role-based collections are accessible based on your admin role
- [ ] Rules correctly restrict access

---

## Firebase Configuration Checklist

- [ ] Service account key created and base64 encoded
- [ ] `FIREBASE_ADMIN_SDK_B64` set in Netlify environment
- [ ] Email/Password authentication enabled in Firebase Console
- [ ] Password reset email template configured (or using default)
- [ ] Firestore security rules updated (if using Firestore)
- [ ] All other Netlify env vars verified
- [ ] EmailJS environment variables set (EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, EMAILJS_SERVICE_ID)
- [ ] EmailJS template `template_bulk_invite` created

---

## Running Your First Test

Once the above is configured:

```bash
# Make sure Netlify function is deployed
netlify deploy

# Run the bulk creation (will only create your test email)
npm run create:users

# Check your email for invitation
# Click the link to set your password
# Log in to verify it works
```

---

## Expected Results

After running the test with your email:

1. ✅ Account created in Firebase
2. ✅ Custom claim `role: admin` set
3. ✅ Invitation email received with password reset link
4. ✅ Can click link and set password
5. ✅ Can log in with email + password
6. ✅ Admin dashboard shows all permissions

---

## Troubleshooting Firebase Setup

| Problem | Solution |
|---------|----------|
| "Email/Password not enabled" | Go to Firebase Console → Authentication → Sign-in methods, enable Email/Password |
| "Custom claim not showing" | Custom claims only appear after user signs in and token is refreshed |
| "Can't set custom claims" | Make sure `FIREBASE_ADMIN_SDK_B64` is correctly base64 encoded and set in Netlify |
| "Password reset email not received" | Check email template is configured, verify EMAILJS settings |
| "User already exists" | Delete test user from Firebase Console and try again |

---

## Next Steps

1. ✅ Follow steps 1-6 above to configure Firebase
2. ✅ Deploy: `netlify deploy`
3. ✅ Run test: `npm run create:users`
4. ✅ Check email for invitation
5. ✅ Test logging in
6. ✅ Verify custom claim in Firebase Console
7. ✅ Once working, bulk-create all other users

---

## Firebase Security Best Practices

- ✅ Only store the base64 service account in Netlify (not in code)
- ✅ Rotate service account keys periodically
- ✅ Use Firestore security rules to enforce role-based access
- ✅ Never log or display the service account key
- ✅ Restrict Netlify function calls to authenticated users (if needed)

