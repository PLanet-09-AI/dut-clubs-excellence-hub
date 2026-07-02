import { Handler, HandlerEvent } from '@netlify/functions';
import emailjs from '@emailjs/nodejs';

/**
 * Netlify Function: Send reminder emails to incomplete nominators
 * 
 * Called from admin panel to send bulk reminder emails
 * Requires: VITE_EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY environment variables
 */

const EMAILJS_PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || '';
const EMAILJS_SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.VITE_EMAILJS_TEMPLATE_ID || '';

interface ReminderRequest {
  nominatorEmail: string;
  nominatorName: string;
  nomineeName: string;
  categoryName: string;
  categoryId: string;
  incompleteItems: string[];
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Check for required environment variables
    if (!EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID) {
      console.error('Missing EmailJS configuration');
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'EmailJS not configured. Set VITE_EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, VITE_EMAILJS_SERVICE_ID, and VITE_EMAILJS_TEMPLATE_ID',
        }),
      };
    }

    // Initialize EmailJS with private key (server-side)
    emailjs.init({
      publicKey: EMAILJS_PUBLIC_KEY,
      privateKey: EMAILJS_PRIVATE_KEY,
    });

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const recipients: ReminderRequest[] = body.recipients || [];

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No recipients provided' }),
      };
    }

    // Send emails
    const results = [];
    for (const recipient of recipients) {
      try {
        const response = await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: recipient.nominatorEmail,
            nominator_name: recipient.nominatorName,
            nominee_name: recipient.nomineeName,
            category_name: recipient.categoryName,
            incomplete_items: recipient.incompleteItems.join('\n• '),
            submission_url: `${process.env.URL || 'https://example.com'}/nominate/${recipient.categoryId}`,
            current_year: new Date().getFullYear(),
          }
        );

        results.push({
          email: recipient.nominatorEmail,
          success: true,
          messageId: response.status === 200 ? 'sent' : 'failed',
        });

        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to send email to ${recipient.nominatorEmail}:`, error);
        results.push({
          email: recipient.nominatorEmail,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Sent ${successCount} reminders successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        results,
        successCount,
        failureCount,
      }),
    };
  } catch (error) {
    console.error('Error in send-reminders function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};
