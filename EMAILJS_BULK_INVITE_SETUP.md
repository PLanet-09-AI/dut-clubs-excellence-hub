# EmailJS Invitation Template Setup

## Create a New EmailJS Template for Bulk User Invitations

This template is used when creating new admin and judge accounts. Each user receives a personalized password reset link.

### Template Details

**Template ID:** `template_bulk_invite`

**Variables needed:**
- `to_email` — User's email address
- `to_name` — User's full name
- `user_role` — Either "Administrator" or "Judge"
- `reset_link` — Firebase password reset link
- `support_email` — Support contact email

### Step 1: Create the Template in EmailJS

1. Log in to [emailjs.com](https://www.emailjs.com/)
2. Go to **Email Templates**
3. Click **Create New Template**
4. Name it: `template_bulk_invite`
5. Set **From Email**: Your configured email service address
6. Set **To Email**: `{{to_email}}`

### Step 2: Template Content

**Subject:**
```
Welcome to DUT Excellence Awards System - Set Your Password
```

**Email Body:**

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; border: 1px solid #ddd; border-top: none; }
        .button { 
            display: inline-block; 
            background-color: #007bff; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
        }
        .button:hover { background-color: #0056b3; }
        .footer { 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            font-size: 12px; 
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DUT Excellence Awards System</h1>
        </div>
        <div class="content">
            <p>Hi {{to_name}},</p>
            
            <p>Welcome! You have been added as a <strong>{{user_role}}</strong> to the DUT Excellence Awards System.</p>
            
            <p>To set your password and access the system, please click the button below:</p>
            
            <center>
                <a href="{{reset_link}}" class="button">Set Your Password</a>
            </center>
            
            <p><strong>Or copy this link:</strong></p>
            <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all; font-size: 12px;">
                {{reset_link}}
            </p>
            
            <p><strong>What's next?</strong></p>
            <ul>
                <li>Click the button above to create your password</li>
                <li>Use your email address ({{to_email}}) and new password to log in</li>
                <li>Complete your profile in the system</li>
            </ul>
            
            <p>If you have any questions or didn't expect this invitation, please contact us at <strong>{{support_email}}</strong></p>
            
            <div class="footer">
                <p>© 2026 DUT Excellence Awards System. All rights reserved.</p>
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </div>
</body>
</html>
```

### Step 3: Save the Template

1. Click **Save** to create the template
2. Note the **Template ID** (should be `template_bulk_invite`)
3. Make sure this template uses the same **Service ID** as your other email templates

### Step 4: Verify Variables

The template should have these variables:
- `{{to_email}}`
- `{{to_name}}`
- `{{user_role}}`
- `{{reset_link}}`
- `{{support_email}}`

### Step 5: Test the Template

1. In EmailJS dashboard, go to your new template
2. Click **Send Test Email**
3. Fill in sample values:
   - to_email: `your-test-email@example.com`
   - to_name: `John Doe`
   - user_role: `Administrator`
   - reset_link: `https://example.com/auth/reset`
   - support_email: `support@dut.ac.za`
4. Click **Send Test**

### Troubleshooting

**Template not found error:**
- Verify the Template ID is exactly `template_bulk_invite`
- Check that VITE_EMAILJS_SERVICE_ID is set in your environment

**Variables not replaced:**
- Ensure all variable names match exactly (case-sensitive)
- Wrap them in `{{}}` not `{}`

**Email not sending:**
- Check that EMAILJS_PRIVATE_KEY is set in Netlify environment
- Verify the email service is connected in EmailJS dashboard
- Check Netlify function logs for errors
