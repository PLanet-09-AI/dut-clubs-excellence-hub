import { Handler, HandlerEvent } from '@netlify/functions';
import emailjs from '@emailjs/nodejs';

/**
 * Netlify Function: Send shortlist notification email to a nominee
 * 
 * Called from admin panel when marking a nomination as shortlisted
 * Requires: VITE_EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_SHORTLIST_TEMPLATE_ID environment variables
 */

const EMAILJS_PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || '';
const EMAILJS_SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_SHORTLIST_TEMPLATE_ID = process.env.VITE_EMAILJS_SHORTLIST_TEMPLATE_ID || '';

interface ShortlistEmailRequest {
  nomineeName: string;
  nomineeEmail: string;
  nominatorName: string;
  categoryName: string;
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
    if (!EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_SHORTLIST_TEMPLATE_ID) {
      console.error('Missing EmailJS configuration');
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'EmailJS not configured. Set VITE_EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, VITE_EMAILJS_SERVICE_ID, and VITE_EMAILJS_SHORTLIST_TEMPLATE_ID',
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
    const { nomineeName, nomineeEmail, nominatorName, categoryName } = body as ShortlistEmailRequest;

    // Validate required fields
    if (!nomineeEmail || !nomineeName || !categoryName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: nomineeEmail, nomineeName, categoryName' }),
      };
    }

    try {
      const templateParams = {
        to_email: nomineeEmail,
        nominee_name: nomineeName,
        nominator_name: nominatorName,
        category_name: categoryName,
        submission_url: `https://salea2026.netlify.app/winners`,
        current_year: new Date().getFullYear(),
      };

      console.log('📧 Sending shortlist notification email:', {
        to_email: templateParams.to_email,
        nominee_name: templateParams.nominee_name,
        category_name: templateParams.category_name,
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_SHORTLIST_TEMPLATE_ID,
      });

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_SHORTLIST_TEMPLATE_ID,
        templateParams
      );

      console.log(`✓ Shortlist email sent to ${nomineeEmail}`, { status: response.status });

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
      const fullError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`✗ Failed to send shortlist email to ${nomineeEmail}:`, {
        error: errorMsg,
        errorStack: fullError.stack,
        errorDetails: String(error),
        nomineeEmail,
        categoryName,
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_SHORTLIST_TEMPLATE_ID,
      });
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          email: nomineeEmail,
          error: errorMsg,
          debug: {
            hasServiceId: !!EMAILJS_SERVICE_ID,
            hasShortlistTemplateId: !!EMAILJS_SHORTLIST_TEMPLATE_ID,
            hasPublicKey: !!EMAILJS_PUBLIC_KEY,
            hasPrivateKey: !!EMAILJS_PRIVATE_KEY,
            errorStack: fullError.stack,
          },
        }),
      };
    }
  } catch (error) {
    console.error('Error in send-shortlist-email function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
