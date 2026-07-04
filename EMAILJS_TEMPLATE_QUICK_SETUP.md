# EmailJS Template Setup - Visual Quick Reference

## 🎯 Quick Setup (2 minutes)

### Step 1: Go to EmailJS
https://dashboard.emailjs.com/admin/templates → Click **"Create New Template"**

---

### Step 2: Fill the Form (Copy/Paste Below)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TEMPLATE NAME (internal label only)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  dut_nomination_reminder                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  SUBJECT (what appears in email subject line)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Complete Your {{category_name}} Nomination - Missing Documents             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  CONTENT (paste the HTML template - see section below)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  [PASTE HTML HERE - see HTML section below]                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  TO EMAIL (recipient - dynamic)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  {{to_email}}                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  FROM NAME (appears in "From:" line)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  DUT Excellence Awards                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  FROM EMAIL                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ☑ Use Default Email Address                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  REPLY TO (optional)                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  22172605@dut4life.ac.za                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  CC (leave empty)                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  [empty]                                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  BCC (leave empty)                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  [empty]                                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 HTML CONTENT to Paste

Copy everything below (starts with `<div`) and paste into the **CONTENT** field:

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

      <!-- DYNAMIC MISSING DOCUMENTS SECTION -->
      <div style="background: #fff8f1; border-left: 4px solid #d4a574; padding: 16px; margin: 20px 0; border-radius: 4px">
        <p style="margin: 0 0 12px 0; color: #1a2b4a; font-weight: 600; font-size: 14px">
          📋 Missing Documents:
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #3a4a6a">
          {{incomplete_items_html}}
        </ul>
      </div>
      <!-- Each nominee gets their specific missing documents here! -->

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

## ✅ What Makes This Dynamic

The **`{{incomplete_items_html}}`** in the HTML above automatically becomes:

```html
<li>Resume/CV (for: "Tell us about the nominee...")</li>
<li>Letter of Recommendation (for: "Who can vouch for them...")</li>
<li>Proof of Achievement (for: "What makes them exceptional...")</li>
```

Each nominee gets **their specific list** - automatically generated when the email is sent!

---

## 🔄 How It All Connects

```
Admin Dashboard
    ↓
[Click "Send to Nominee" button]
    ↓
JavaScript function `sendNomineeReminderEmail()` triggers
    ↓
Generates list of MISSING documents for that nominee
    ↓
Formats them as: <li>Document Name</li>
    ↓
Replaces {{incomplete_items_html}} with that list
    ↓
Sends email using EmailJS template
    ↓
Nominee receives email with THEIR specific missing docs
```

---

## 📧 Example Email Received

**Subject:** Complete Your Leadership Excellence Nomination - Missing Documents

**Body:**

---

**[DUT Excellence Awards Header with Gold Gradient]**

Hello Mrs. Jane Smith,

Thank you for nominating John Doe for the Leadership Excellence award! 🎉

We noticed that your nomination is almost complete, but we're missing some supporting documents to finalize the submission. These documents are essential for the judging panel to properly evaluate the nomination.

**📋 Missing Documents:**
- Resume/CV (for: "Tell us about the nominee...")
- Letter of Recommendation (from a supervisor/manager)
- Proof of Academic Excellence or Achievement

Please upload these documents to complete your nomination. It only takes a few minutes!

**[📄 Upload Documents Now] (Button)**

Need help? The link above will take you directly to your nomination form where you can upload the missing documents.

⏰ Please complete your nomination as soon as possible. The judging panel reviews submissions on a rolling basis.

---

This is an automated reminder from the DUT Excellence Awards system.
© 2026 DUT Excellence Awards. All rights reserved.

---

## ❗ Important Notes

✅ **Each person gets their SPECIFIC missing documents**  
✅ **Variables are replaced automatically**  
✅ **HTML renders properly in all email clients**  
✅ **Mobile responsive design**  
✅ **DUT brand colors applied throughout**  

❌ **Don't modify the `{{` variables `}}`** - they're replaced by the system  
❌ **Don't remove the `{{incomplete_items_html}}`** - that's where the missing docs go  
❌ **Keep the HTML as-is** - all styling is built-in  

---

## 🚀 Next Steps

1. Copy all the text above
2. Paste into EmailJS template form
3. Click **Save Template**
4. Get your **API keys**
5. Add to `.env.local`
6. Restart dev server
7. Test sending an email!

**See EMAIL_TEMPLATE_HTML.md for full troubleshooting guide.**
