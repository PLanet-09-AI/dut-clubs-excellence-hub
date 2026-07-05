# Email Templates Setup Guide

## Overview

The DUT Excellence Awards system uses **two separate EmailJS templates** for different communication purposes:

| Template | Purpose | Recipients | Variables |
|----------|---------|------------|-----------|
| **Reminder** | Missing documents notification | Nominees with incomplete nominations | `to_email`, `nominee_name`, `nominator_name`, `category_name`, `incomplete_items_html`, `submission_url`, `current_year` |
| **Shortlist** | Congratulations/shortlist notification | Shortlisted nominees | `to_email`, `nominee_name`, `nominator_name`, `category_name`, `submission_url`, `current_year` |

---

## Template 1: Reminder Email (Missing Documents)

**Environment Variable:** `VITE_EMAILJS_TEMPLATE_ID`  
**Current Value:** `template_leibu8w`  
**Netlify Function:** `send-nominee-reminder`

### Setup Steps:

1. Go to **EmailJS Dashboard** → **Templates**
2. **Create New Template** (or edit existing `template_leibu8w`)
3. **Template Settings:**
   - Name: `Nominee Reminder` or similar
   - Email Format: **HTML** ✅
   - Subject: `Complete Your Award Nomination - {{category_name}}`

4. **Template Body:**
   - Copy from `.planning/emailjs-template.html`
   - Must include: `{{{incomplete_items_html}}}` (THREE curly braces for raw HTML)

5. **Save & Copy Template ID**
   - Example: `template_leibu8w`
   - Add to `.env.local`: `VITE_EMAILJS_TEMPLATE_ID=template_leibu8w`

---

## Template 2: Shortlist Email (Congratulations)

**Environment Variable:** `VITE_EMAILJS_SHORTLIST_TEMPLATE_ID`  
**Current Value:** *(needs to be set)*  
**Netlify Function:** `send-shortlist-email`

### Setup Steps:

1. Go to **EmailJS Dashboard** → **Templates**
2. **Create New Template**
3. **Template Settings:**
   - Name: `Shortlist Notification` or similar
   - Email Format: **HTML** ✅
   - Subject: `🎉 Congratulations! You've Been Shortlisted - {{category_name}}`

4. **Template Body:**
   - Copy from `.planning/emailjs-template-shortlist.html`
   - All variables use TWO curly braces: `{{variable_name}}`

5. **Save & Copy Template ID**
   - Example: `template_xyz123`
   - Add to `.env.local`: `VITE_EMAILJS_SHORTLIST_TEMPLATE_ID=template_xyz123`

6. **Add to Netlify Environment Variables:**
   - Go to Netlify → Site Settings → Build & Deploy → Environment
   - Add: `VITE_EMAILJS_SHORTLIST_TEMPLATE_ID=template_xyz123`

---

## Environment Variables Summary

### `.env.local` (Local Development)
```env
VITE_EMAILJS_PUBLIC_KEY=4BN4F9k2Kuk12lcJG
VITE_EMAILJS_SERVICE_ID=service_c0fwig6
VITE_EMAILJS_TEMPLATE_ID=template_leibu8w          # Reminders
VITE_EMAILJS_SHORTLIST_TEMPLATE_ID=template_xxxxx  # Shortlist
EMAILJS_PRIVATE_KEY=CC5Ly5XCk5Oh0EfrOOMeY
```

### Netlify Environment Variables (Production)
Add these in **Site Settings → Build & Deploy → Environment:**
```
VITE_EMAILJS_PUBLIC_KEY=4BN4F9k2Kuk12lcJG
VITE_EMAILJS_SERVICE_ID=service_c0fwig6
VITE_EMAILJS_TEMPLATE_ID=template_leibu8w          # Reminders
VITE_EMAILJS_SHORTLIST_TEMPLATE_ID=template_xxxxx  # Shortlist
EMAILJS_PRIVATE_KEY=CC5Ly5XCk5Oh0EfrOOMeY
```

---

## Template Variable Reference

### Reminder Template Variables
- `{{to_email}}` - Nominee's email
- `{{nominee_name}}` - Nominee's name
- `{{nominator_name}}` - Person who nominated them
- `{{category_name}}` - Award category
- `{{{incomplete_items_html}}}` - **Raw HTML list** of missing documents ← THREE braces
- `{{submission_url}}` - Link to nomination form with hash: `https://salea2026.netlify.app/nominate/{categoryId}#documents`
- `{{current_year}}` - Current year (auto-populated)

### Shortlist Template Variables
- `{{to_email}}` - Nominee's email
- `{{nominee_name}}` - Nominee's name
- `{{nominator_name}}` - Person who nominated them
- `{{category_name}}` - Award category
- `{{submission_url}}` - Link to awards page: `https://salea2026.netlify.app/winners`
- `{{current_year}}` - Current year (auto-populated)

---

## Admin Features

### Send Reminders
- **Location:** Admin panel → Admin Actions → "Send Reminders"
- **Triggers:** Sends to all nominees with incomplete nominations
- **Template Used:** Reminder (VITE_EMAILJS_TEMPLATE_ID)

### Email Shortlisted
- **Location:** Admin panel → Admin Actions → "Email Shortlisted"
- **Triggers:** Sends to all shortlisted nominees
- **Template Used:** Shortlist (VITE_EMAILJS_SHORTLIST_TEMPLATE_ID)

---

## Troubleshooting

### "Missing EmailJS configuration" Error
**Check:**
- ✅ `VITE_EMAILJS_SHORTLIST_TEMPLATE_ID` is set in `.env.local`
- ✅ Template exists in EmailJS with correct ID
- ✅ Environment variables deployed to Netlify

### HTML Not Rendering in Email
**Ensure:**
- ✅ Template format is set to **HTML** (not Text)
- ✅ For `incomplete_items_html`: Use `{{{variable}}}` (THREE braces)
- ✅ For other variables: Use `{{variable}}` (TWO braces)

### Wrong Template Sending
**Verify:**
- ✅ Reminder function uses: `VITE_EMAILJS_TEMPLATE_ID`
- ✅ Shortlist function uses: `VITE_EMAILJS_SHORTLIST_TEMPLATE_ID`
- ✅ Both functions use same service ID: `service_c0fwig6`

---

## Quick Setup Checklist

- [ ] Create Reminder template in EmailJS (template_leibu8w)
- [ ] Create Shortlist template in EmailJS (get new ID)
- [ ] Update `.env.local` with VITE_EMAILJS_SHORTLIST_TEMPLATE_ID
- [ ] Deploy to Netlify and add environment variable there too
- [ ] Test "Send Reminders" button → verify HTML renders
- [ ] Test "Email Shortlisted" button → verify congratulations email sends
- [ ] Monitor email logs for errors
