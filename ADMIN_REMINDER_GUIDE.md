# Admin Guide - Send Email Reminders to Nominees

## Overview
The admin panel now includes two ways to send reminder emails:
1. **Bulk send** - Send reminders to all incomplete nominators at once
2. **Individual send** - Send an email directly to each specific nominee

## Feature: Send Reminders to Nominees

### When to Use
Send individual reminder emails to nominees who have incomplete nominations (missing required supporting documents). This helps them upload the necessary documents to complete their nomination.

### How It Works

**Step 1: Access the Reminder Modal**
- Go to Admin Dashboard
- Click the **"Send Reminders"** button in the top navigation (shows count of incomplete nominations)
  - Example: "📧 Send Reminders (5)"

**Step 2: Review Incomplete Nominations**
The modal shows:
- **Summary Card**: Shows total count of incomplete nominations
- **Recipients List**: Each incomplete nomination shows:
  - Nominator name and email
  - Nominee name, email, and category
  - List of missing documents

**Step 3: Send Email to Nominee**
For each incomplete nomination, click the **"Send to Nominee"** button:
- Sends an email directly to the NOMINEE (not the nominator)
- Email includes:
  - Personalized greeting with their name
  - List of missing documents
  - Link to upload/complete their nomination
  - Styled with DUT brand colors (gold and navy)

**Step 4: View Send Status**
After clicking send:
- Button shows loading state: "Sending..."
- Result appears below the nomination:
  - ✅ Green: "Email sent to nominee"
  - ❌ Red: Error message with details

### Email Template Content

The reminder email sent to nominees includes:
- **Subject**: "Complete Your [Category] Nomination - Missing Documents"
- **Content**:
  - Welcome and thank you message
  - Why documents are important
  - Clear list of missing documents in a formatted box
  - Call-to-action button: "Upload Documents Now"
  - Help section with link to nomination guide
  - Deadline reminder
  - Footer with DUT branding

### Email Design
- Uses DUT brand colors:
  - **Gold**: `#d4a574` to `#dab68f` (buttons, accents)
  - **Navy**: `#1a2b4a` (headings, dark text)
  - **Light Blue**: `#3a4a6a` (body text)
- Professional, clean layout
- Mobile-responsive
- Includes visual hierarchy and white space

### Alternative: Send to All Nominators
The modal also includes a **"Send [N] Reminder Emails"** button that:
- Sends bulk reminders to all nominators with incomplete nominations
- Uses the Netlify serverless function backend
- Shows results for each recipient (success/failure)
- Processes with 100ms delay between emails to avoid rate limiting

## Environment Setup (Required)

Before reminders can be sent, set up EmailJS:

### 1. Create EmailJS Account
- Go to https://emailjs.com
- Sign up with your DUT email: `22172605@dut4life.ac.za`
- Service ID: `service_c0fwig6`

### 2. Create Email Template
- In EmailJS Dashboard → Email Templates
- Create new template with:
  - **Name**: `dut_nomination_reminder`
  - **Subject**: `Complete Your {{category_name}} Nomination - Missing Documents`
  - **Content**: Use the HTML template provided in [EMAIL_TEMPLATE_HTML.md](../EMAIL_TEMPLATE_HTML.md)

### 3. Add Environment Variables
Add to `.env.local`:
```
VITE_EMAILJS_PUBLIC_KEY=your_public_key
VITE_EMAILJS_SERVICE_ID=service_c0fwig6
VITE_EMAILJS_TEMPLATE_ID=dut_nomination_reminder
EMAILJS_PRIVATE_KEY=your_private_key_here
```

Get keys from:
- Public Key: EmailJS Dashboard → Account → API Key
- Private Key: EmailJS Dashboard → Account → API Key (with warning about security)

### 4. Deploy to Netlify
Add the same environment variables to Netlify:
- Log into Netlify dashboard
- Settings → Build & Deploy → Environment → Environment variables
- Add the three variables above

## Features Explained

### Incomplete Nomination Detection
The system automatically identifies incomplete nominations by:
- Checking if all required documents are uploaded
- Comparing uploads against award category requirements
- Marking nominations as incomplete if any required document is missing

### Trigger-Based Validation
The "Send to Nominee" button is automatically:
- ✅ **Enabled** only if the nominee has incomplete documents
- ❌ **Disabled** if all required documents are already uploaded

This ensures you only send reminders when needed.

### Error Handling
If an email fails to send:
- You'll see an error message under that nomination
- The error details help debug the issue
- Other nominations continue processing
- Check browser console for full error logs

## Troubleshooting

### "EmailJS not configured" Error
- Verify environment variables are set in `.env.local`
- Restart the dev server after adding variables
- Check that VITE_ prefix is used for client-side variables

### Emails Not Sending
1. **Check EmailJS Status**:
   - Go to https://dashboard.emailjs.com/admin/history
   - Look for failed sends and error details

2. **Verify Template**:
   - Template ID must match: `dut_nomination_reminder`
   - Service ID must be: `service_c0fwig6`
   - All variables ({{...}}) must be in the template

3. **Check Rate Limiting**:
   - EmailJS free plan: 200 requests per month
   - Check Usage at: https://dashboard.emailjs.com/admin

4. **Test One Email First**:
   - Send to one incomplete nominee first
   - Check if email arrives in their inbox
   - If it works, send to others

### Email Content Issues
- If variables aren't replacing (showing `{{variable_name}}`):
  - Variables in template must match exactly (case-sensitive)
  - Common variables: `to_email`, `nominee_name`, `incomplete_items_html`, etc.

## Best Practices

1. **Preview Before Bulk Send**
   - Send to one nominee first to verify email looks correct
   - Check formatting and all information is accurate

2. **Use Individual Sends for Follow-ups**
   - Send individual emails if only some nominees need reminders
   - Tracking shows exactly which nominees received emails

3. **Monitor Submissions**
   - After sending reminders, check if nominations get updated
   - Give nominees 24-48 hours before sending another reminder

4. **Document Communication**
   - Note in audit logs when reminders were sent
   - Helps with transparency and follow-up

## Related Documentation
- [EMAIL_TEMPLATE_HTML.md](../EMAIL_TEMPLATE_HTML.md) - Complete email template
- [EMAILJS_SETUP.md](../EMAILJS_SETUP.md) - Detailed EmailJS setup guide
- [Nomination Form](../src/routes/nominate.$categoryId.tsx) - Document validation logic
