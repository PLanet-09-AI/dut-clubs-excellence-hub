# EmailJS Configuration Guide

## Setting Up Email Reminders

The nomination system includes automated reminder emails for users who haven't completed their submissions with all required documents. This uses **EmailJS** to send emails through a transactional email service.

### Step 1: Create an EmailJS Account

1. Visit [emailjs.com](https://www.emailjs.com/) and create a free account
2. Go to the **Admin Dashboard**
3. Note your **Public Key** (found in Account → API Keys)

### Step 2: Create an Email Service

1. In EmailJS Admin Dashboard, go to **Email Services**
2. Create a new service (e.g., "Gmail", "SendGrid", etc.)
3. Connect your email provider following the EmailJS setup wizard
4. Note your **Service ID**

### Step 3: Create an Email Template

1. Go to **Email Templates** in the Admin Dashboard
2. Create a new template with the following variables:
   - `to_email` — Nominator's email address
   - `nominator_name` — Full name of nominator
   - `nominee_name` — Full name of nominee
   - `category_name` — Award category name
   - `incomplete_items` — List of missing documents (bullet-pointed)
   - `submission_url` — Link to complete the nomination
   - `current_year` — Current year

**Example Template Content:**

```
Subject: Reminder: Complete Your Nomination for {{category_name}}

Dear {{nominator_name}},

We noticed that your nomination for {{nominee_name}} in the {{category_name}} category is incomplete. 

To submit your nomination, please upload the following missing documents:
{{incomplete_items}}

You can complete your submission here:
{{submission_url}}

Thank you for recognizing excellence at DUT!

Best regards,
SALEA 2026 Awards Committee
```

4. Note your **Template ID**

### Step 4: Get Your Private Key

1. In EmailJS Admin Dashboard, go to **Account** → **API Keys**
2. Click on the service you created to reveal the **Private Key**
3. Copy this securely

### Step 5: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# EmailJS Configuration
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
```

For the Netlify function, also add:

```env
# Netlify Function (server-side)
EMAILJS_PRIVATE_KEY=your_private_key_here
```

### Step 6: Test the Configuration

1. Deploy the function: `npm run build:netlify`
2. Go to the Admin Panel
3. Look for the "Send Reminders" button (shows count of incomplete nominations)
4. Click to send test reminders

### Troubleshooting

- **"EmailJS not configured" error**: Check that all four environment variables are set correctly
- **Emails not sending**: Verify your email service is connected in EmailJS admin panel
- **Template variables not replaced**: Double-check variable names match exactly in the template
- **Check logs**: Use `netlify functions:invoke send-reminders` for local testing

### Email Limits

- **Free tier**: 200 emails/month
- **Paid tier**: Unlimited

For production use, consider upgrading your EmailJS plan.

### Security Notes

- ⚠️ **Never commit `.env.local` to version control**
- 🔒 **Store Private Key securely** — treat like a password
- 📋 **Monitor email sending** — check your EmailJS dashboard for bounces
- ✅ **Test with a staging email** before sending to all nominators
