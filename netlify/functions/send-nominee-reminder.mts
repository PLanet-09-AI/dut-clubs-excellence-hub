import { Handler, HandlerEvent } from '@netlify/functions';
import emailjs from '@emailjs/nodejs';

/**
 * Netlify Function: Send reminder email to a nominee
 * 
 * Called from admin panel to send reminder to a nominee with incomplete nomination
 * Requires: VITE_EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY environment variables
 */

const EMAILJS_PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || '';
const EMAILJS_SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.VITE_EMAILJS_TEMPLATE_ID || '';

interface NomineeReminderRequest {
  nomineeEmail: string;
  nomineeName: string;
  nominatorName: string;
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
    const { nomineeEmail, nomineeName, nominatorName, categoryName, categoryId, incompleteItems } = body as NomineeReminderRequest;

    // Validate required fields
    if (!nomineeEmail || !nomineeName || !categoryId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: nomineeEmail, nomineeName, categoryId' }),
      };
    }

    // Build incomplete items HTML with proper formatting
    const incompleteItemsHtml = `<ul style="margin: 10px 0; padding-left: 20px; line-height: 1.6;">
${incompleteItems.map((item: string) => `  <li style="margin-bottom: 8px; color: #333;">${item}</li>`).join('\n')}
</ul>`;

    try {
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: nomineeEmail,
          nominator_name: nominatorName,
          nominee_name: nomineeName,
          category_name: categoryName,
          incomplete_items: incompleteItems.join('\n• '),
          incomplete_items_html: incompleteItemsHtml,
          submission_url: `https://salea2026.netlify.app/nominate/${categoryId}#documents`,
          current_year: new Date().getFullYear(),
        }
      );

      console.log(`✓ Email sent to ${nomineeEmail}`, { messageId: response.status });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          email: nomineeEmail,
          messageId: response.status === 200 ? 'sent' : 'failed',
        }),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`✗ Failed to send email to ${nomineeEmail}:`, {
        error: errorMsg,
        nomineeEmail,
        categoryId,
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_TEMPLATE_ID,
      });
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          email: nomineeEmail,
          error: errorMsg,
          debug: {
            hasServiceId: !!EMAILJS_SERVICE_ID,
            hasTemplateId: !!EMAILJS_TEMPLATE_ID,
            hasPublicKey: !!EMAILJS_PUBLIC_KEY,
            hasPrivateKey: !!EMAILJS_PRIVATE_KEY,
          },
        }),
      };
    }
  } catch (error) {
    console.error('Error in send-nominee-reminder function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};
