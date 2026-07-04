# EmailJS - "To Email" Field Reference

## 🎯 What Goes In "To Email" Field?

```
{{to_email}}
```

That's it! Just copy and paste: `{{to_email}}`

---

## 📧 Who Receives The Email?

**The NOMINEE** receives the email, not the nominator.

```
Nominee Email: {{to_email}}
```

**Example:** john.doe@dut4life.ac.za receives email about their incomplete nomination

---

## 🔄 How It Works

1. Admin clicks **"Send to Nominee"** button
2. System finds the **nominee's email address**
3. Replaces `{{to_email}}` with **john.doe@dut4life.ac.za**
4. Email is sent to **that nominee**

---

## ✅ EmailJS Template Fields Summary

| Field | What to Put | Example |
|-------|-------------|---------|
| **Template Name** | Internal label | `dut_nomination_reminder` |
| **Subject** | Email subject line | `Complete Your {{category_name}} Nomination - Missing Documents` |
| **Content** | HTML template | `<div>... {{incomplete_items_html}} ...</div>` |
| **To Email** | ⭐ **`{{to_email}}`** | Becomes: john.doe@dut4life.


ac.za |
| **From Name** | Who it's from | `DUT Excellence Awards` |
| **From Email** | ☑ Use Default | Your EmailJS service email |
| **Reply To** | Where replies go | `22172605@dut4life.ac.za` |
| **CC** | Leave blank | _(empty)_ |
| **BCC** | Leave blank | _(empty)_ |

---

## 📝 Form Layout in EmailJS

```
Template Name:     dut_nomination_reminder
Subject:           Complete Your {{category_name}} Nomination - Missing Documents
Content:           [HTML template pasted here]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To Email:          {{to_email}}              ← NOMINEE'S EMAIL
From Name:         DUT Excellence Awards
From Email:        ☑ Use Default Email Address
Reply To:          22172605@dut4life.ac.za
CC:                [leave empty]
BCC:               [leave empty]
```

---

## ❓ FAQ

**Q: Does the nominee's email need to be entered manually?**  
A: No! The variable `{{to_email}}` automatically replaces with the nominee's actual email from the database.

**Q: What if I put a static email instead of `{{to_email}}`?**  
A: All emails would go to that one address instead of to each nominee. Don't do this!

**Q: Where does `{{to_email}}` come from?**  
A: From the admin's "Send to Nominee" button click - it sends the nominee's email address from the database.

**Q: Can I customize the email per recipient?**  
A: Yes! The entire email is customized:
- `{{to_email}}` → nominee's email
- `{{nominee_name}}` → their name
- `{{incomplete_items_html}}` → their specific missing documents

---

## ✨ That's All!

Just put: **`{{to_email}}`**

Everything else handles automatically! 🚀
