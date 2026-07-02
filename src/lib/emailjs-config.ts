/**
 * EmailJS Configuration & Helpers
 * 
 * Initialize EmailJS with your public key for sending reminder emails
 * to users who haven't completed their nominations.
 */

import emailjs from 'emailjs-com';

// Initialize EmailJS with your public key
// Get your public key from: https://dashboard.emailjs.com/admin/account
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';

let initialized = false;

export function initEmailJS() {
  if (!initialized && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    initialized = true;
  }
}

/**
 * Send a reminder email to incomplete nominators
 */
export async function sendReminderEmail(
  nominatorEmail: string,
  nominatorName: string,
  nomineeName: string,
  categoryName: string,
  incompleteItems: string[]
) {
  try {
    initEmailJS();

    if (!initialized || EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
      console.warn('EmailJS not configured. Set environment variables VITE_EMAILJS_PUBLIC_KEY, VITE_EMAILJS_SERVICE_ID, and VITE_EMAILJS_TEMPLATE_ID');
      return { success: false, error: 'EmailJS not configured' };
    }

    const templateParams = {
      to_email: nominatorEmail,
      nominator_name: nominatorName,
      nominee_name: nomineeName,
      category_name: categoryName,
      incomplete_items: incompleteItems.join('\n• '),
      submission_url: `${window.location.origin}/nominate/${categoryName.toLowerCase().replace(/\s+/g, '-')}`,
      current_year: new Date().getFullYear(),
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to send reminder email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send bulk reminder emails to multiple incomplete nominators
 */
export async function sendBulkReminderEmails(
  recipients: Array<{
    email: string;
    name: string;
    nomineeName: string;
    categoryName: string;
    incompleteItems: string[];
  }>
) {
  const results = [];

  for (const recipient of recipients) {
    const result = await sendReminderEmail(
      recipient.email,
      recipient.name,
      recipient.nomineeName,
      recipient.categoryName,
      recipient.incompleteItems
    );
    results.push({ email: recipient.email, ...result });
    
    // Add a small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
