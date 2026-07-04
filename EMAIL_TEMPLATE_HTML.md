# DUT Excellence Awards - Document Reminder Email Template

## DYNAMIC MISSING DOCUMENTS - How It Works

✅ **The missing documents are DYNAMIC** - They automatically populate based on what's actually missing!

When an email is sent:
1. Admin clicks "Send to Nominee" in the reminder modal
2. System detects what documents are MISSING for that specific nominee
3. Each missing document becomes a bullet point in the email
4. The `{{incomplete_items_html}}` variable is replaced with actual missing items

**Example Email Received:**
```
📋 Missing Documents:
• Resume/CV (for: "Tell us about the nominee...")
• Proof of Academic Excellence (for: "Why are they exceptional...")
• Letter of Recommendation (for: "Who can vouch for them...")
```

---

## Step-by-Step EmailJS Template Setup

### Part 1: Access EmailJS Template Creator
1. Go to https://dashboard.emailjs.com/admin/templates
2. Click **"Create New Template"**
3. You'll see a form with these fields (fill them in as shown below)

---

### Part 2: Fill In Template Form Fields

#### ✅ **TEMPLATE NAME** (at the top)
```
dut_nomination_reminder
```
This is just an internal name to identify your template.

---

#### ✅ **SUBJECT** (first large text box)
```
Complete Your {{category_name}} Nomination - Missing Documents
```

**What happens:** When email is sent, `{{category_name}}` is replaced with actual category name.
- Example received: "Complete Your Leadership Excellence Nomination - Missing Documents"

---

#### ✅ **CONTENT** (the large HTML editor box)

⚠️ **IMPORTANT:** This field should have **rich text enabled**. Look for formatting options or switch to **HTML mode** if available.

Copy and paste the COMPLETE HTML below into this field:

```html
<div style="font-family: 'Inter', system-ui, sans-serif; font-size: 15px; line-height: 1.6; background-color: #f5f5f5">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px">
    <!-- Header with theme colors -->
    <div style="background: linear-gradient(135deg, #d4a574 0%, #dab68f 100%); padding: 32px 24px; border-radius: 12px; text-align: center; margin-bottom: 24px">
      <h1 style="margin: 0; color: #1a2b4a; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; letter-spacing: -0.02em">
        DUT Excellence Awards
      </h1>
      <p style="margin: 8px 0 0 0; color: #2a3f5f; font-size: 14px">Complete Your Nomination</p>
    </div>

    <!-- Main content -->
    <div style="background: white; padding: 32px 24px; border-radius: 8px; border: 1px solid #e8e8e8">
      <!-- Greeting -->
      <p style="margin: 0 0 16px 0; color: #1a2b4a; font-size: 16px">
        Hello <strong>{{nominator_name}}</strong>,
      </p>

      <!-- Main message -->
      <p style="margin: 0 0 20px 0; color: #3a4a6a">
        Thank you for nominating <strong>{{nominee_name}}</strong> for the <strong>{{category_name}}</strong> award! 🎉
      </p>

      <p style="margin: 0 0 20px 0; color: #3a4a6a">
        We noticed that your nomination is almost complete, but we're missing some supporting documents to finalize the submission. These documents are essential for the judging panel to properly evaluate the nomination.
      </p>

      <!-- Missing documents section - DYNAMIC CONTENT -->
      <div style="background: #fff8f1; border-left: 4px solid #d4a574; padding: 16px; margin: 20px 0; border-radius: 4px">
        <p style="margin: 0 0 12px 0; color: #1a2b4a; font-weight: 600; font-size: 14px">
          📋 Missing Documents:
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #3a4a6a">
          {{incomplete_items_html}}
        </ul>
      </div>
      <!-- END DYNAMIC SECTION -->

      <!-- Call to action -->
      <p style="margin: 0 0 24px 0; color: #3a4a6a">
        Please upload these documents to complete your nomination. It only takes a few minutes!
      </p>

      <!-- Button -->
      <div style="text-align: center; margin: 28px 0">
        <a 
          href="{{submission_url}}" 
          target="_blank"
          style="
            display: inline-block;
            background: linear-gradient(135deg, #d4a574 0%, #dab68f 100%);
            color: #fff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3);
          "
        >
          📄 Upload Documents Now
        </a>
      </div>

      <!-- Info box -->
      <div style="background: #f0f4f8; padding: 16px; border-radius: 6px; margin: 24px 0">
        <p style="margin: 0; color: #3a4a6a; font-size: 14px">
          <strong>Need help?</strong> The link above will take you directly to your nomination form where you can upload the missing documents.
        </p>
      </div>

      <!-- Deadline notice -->
      <p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #7a8aaa; font-size: 13px">
        ⏰ Please complete your nomination as soon as possible. The judging panel reviews submissions on a rolling basis.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; color: #7a8aaa; font-size: 12px">
      <p style="margin: 0">
        This is an automated reminder from the DUT Excellence Awards system.<br>
        © {{current_year}} DUT Excellence Awards. All rights reserved.
      </p>
    </div>
  </div>
</div>
```

---

#### ✅ **TO EMAIL**
```
{{to_email}}
```
This dynamic variable is replaced with the nominee's actual email address.

---

#### ✅ **FROM NAME**
```
DUT Excellence Awards
```
The name that appears as the sender.

---

#### ✅ **FROM EMAIL**
Choose **"Use Default Email Address"** ✓

OR manually enter the email address associated with your EmailJS service.

---

#### ✅ **REPLY TO** (Optional)
```
22172605@dut4life.ac.za
```
Email address where replies should go.

---

#### ✅ **CC** (Optional)
Leave empty - not needed for this template.

---

#### ✅ **BCC** (Optional)
Leave empty - not needed for this template.

---

## Template Variables Reference

These are all the variables that get populated automatically:

| Variable | What It Contains | Example |
|----------|------------------|---------|
| `{{to_email}}` | Nominee's email address | john.doe@dut4life.ac.za |
| `{{nominator_name}}` | Person who nominated them | Mrs. Jane Smith |
| `{{nominee_name}}` | Nominee's full name | John Doe |
| `{{category_name}}` | Award category | Leadership Excellence |
| `{{incomplete_items_html}}` | **List of missing documents** | `<li>Resume/CV</li><li>Letter of Recommendation</li>` |
| `{{submission_url}}` | Link to nomination form | https://awards.dut.ac.za/nominate/leadership |
| `{{current_year}}` | Current year | 2026 |

---

## The KEY Variable: `{{incomplete_items_html}}`

This is where the **dynamic missing documents** appear!

### How It Works:

1. **Admin clicks "Send to Nominee"** in the Admin Dashboard
2. **System checks what documents are missing** for that nominee
3. **Formats them as HTML list items**:
   ```html
   <li>Resume/CV (for: "Tell us about the nominee...")</li>
   <li>Proof of Academic Excellence (for: "Why are they exceptional...")</li>
   <li>Letter of Recommendation (for: "Who can vouch for them...")</li>
   ```
4. **Replaces `{{incomplete_items_html}}`** with the actual list
5. **Email is sent** with the specific missing documents

### Each Nominee Gets Different Docs!

If nominee A is missing 2 documents, they get 2 bullet points.
If nominee B is missing 4 documents, they get 4 bullet points.

---

## Save and Test

### After Filling All Fields:
1. Click **"Save Template"** at the bottom
2. You'll see: "Template created successfully"
3. Note the **Template ID** (should be visible)

### To Test:
1. Go back to your app
2. Add environment variables to `.env.local`:
   ```
   VITE_EMAILJS_PUBLIC_KEY=your_public_key
   VITE_EMAILJS_SERVICE_ID=service_c0fwig6
   VITE_EMAILJS_TEMPLATE_ID=dut_nomination_reminder
   EMAILJS_PRIVATE_KEY=your_private_key
   ```
3. Restart dev server: `npm run dev`
4. Open Admin Dashboard
5. Click "Send Reminders"
6. Click "Send to Nominee" for any incomplete nomination
7. Check that nominee's email inbox!

---

## Troubleshooting

**❌ Email shows raw HTML instead of formatted:**
- Template wasn't saved as rich text/HTML
- Try switching to HTML editor mode before pasting

**❌ Variables show up as `{{nominee_name}}` in email:**
- Check the Template ID matches exactly
- Make sure environment variables are set correctly
- Restart dev server after changing env vars

**❌ Missing documents list shows nothing:**
- Verify that the nominee actually has missing documents
- Check if the nomination was found in the system
- Look at browser console for error messages

**❌ Email sent but button link is broken:**
- Check `{{submission_url}}` is being populated
- Verify the categoryId is correct in the database

---

## Visual Preview

Here's what the email looks like when received:

```
┌─────────────────────────────────┐
│  DUT Excellence Awards           │  ← Gold gradient header
│  Complete Your Nomination        │
└─────────────────────────────────┘

Hello Jane,

Thank you for nominating John Doe for the Leadership Excellence award! 🎉

We noticed that your nomination is almost complete, but we're missing some supporting documents to finalize the submission...

╔═════════════════════════════════╗
║ 📋 Missing Documents:           ║  ← Dynamic content
║ • Resume/CV                     ║     Each person gets
║ • Letter of Recommendation      ║     their specific list
║ • Proof of Achievement          ║
╚═════════════════════════════════╝

[📄 Upload Documents Now]  ← Button

Need help? The link above will take you...
```

---

## Color Scheme Applied

- **Header**: Gold gradient (#d4a574 → #dab68f)
- **Border**: DUT Gold (#d4a574)
- **Headings**: Navy (#1a2b4a)
- **Body text**: Light blue (#3a4a6a)
- **Background**: Warm cream (#fff8f1)

        © {{current_year}} DUT Excellence Awards. All rights reserved.
      </p>
    </div>
  </div>
</div>
```

---

## Setup Instructions for EmailJS

1. **Log in to EmailJS Dashboard**: https://dashboard.emailjs.com/admin
2. **Go to Email Templates**: https://dashboard.emailjs.com/admin/templates
3. **Create New Template** with:
   - **Template Name**: `dut_nomination_reminder` (or similar)
   - **Subject**: `Complete Your {{category_name}} Nomination - Missing Documents`
   - **Content**: Paste the HTML above into the template editor
   


4. **Template Variables** to add:
   - `{{nominator_name}}`
   - `{{nominee_name}}`
   - `{{category_name}}`
   - `{{incomplete_items_html}}` (receives formatted list)
   - `{{submission_url}}`
   - `{{current_year}}`

5. **Note**: The `{{incomplete_items_html}}` will be generated as a formatted list on the backend

---

## Environment Variables Needed

Add to your `.env.local`:

```
VITE_EMAILJS_PUBLIC_KEY=your_public_key
VITE_EMAILJS_SERVICE_ID=service_c0fwig6
VITE_EMAILJS_TEMPLATE_ID=dut_nomination_reminder
EMAILJS_PRIVATE_KEY=your_private_key_here
```

---

## Color Reference
- **Gold Gradient**: `#d4a574` to `#dab68f` (DUT Brand)
- **Navy**: `#1a2b4a` (Dark text)
- **Light Blue**: `#3a4a6a` (Body text)
- **Background**: `#f5f5f5` (Light gray)
- **Card**: `#ffffff` (White)
- **Accent**: `#fff8f1` (Warm cream)
