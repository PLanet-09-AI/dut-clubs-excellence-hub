import { Handler, HandlerEvent } from '@netlify/functions';
import emailjs from '@emailjs/nodejs';

/**
 * Netlify Function: Send adjudication closure notification email
 * 
 * Called when adjudication period closes
 * Notifies judges and nominees that the adjudication has officially closed
 * Sender: Keshan Govender (KeshanG@dut.ac.za)
 * Requires: VITE_EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_CLOSURE_TEMPLATE_ID environment variables
 */

const EMAILJS_PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || '';
const EMAILJS_SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_CLOSURE_TEMPLATE_ID = process.env.VITE_EMAILJS_CLOSURE_TEMPLATE_ID || '';
const SENDER_EMAIL = 'KeshanG@dut.ac.za';
const SENDER_NAME = 'Keshan Govender';

interface AdjudicationClosureEmailRequest {
  recipientName: string;
  recipientEmail: string;
  recipientType: 'judge' | 'nominee'; // to customize the message
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
    if (!EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_CLOSURE_TEMPLATE_ID) {
      console.error('Missing EmailJS configuration for adjudication closure');
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'EmailJS not configured. Set VITE_EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, VITE_EMAILJS_SERVICE_ID, and VITE_EMAILJS_CLOSURE_TEMPLATE_ID',
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
    const { recipientName, recipientEmail, recipientType } = body as AdjudicationClosureEmailRequest;

    // Validate required fields
    if (!recipientEmail || !recipientName || !recipientType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: recipientEmail, recipientName, recipientType' }),
      };
    }

    if (!['judge', 'nominee'].includes(recipientType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'recipientType must be either "judge" or "nominee"' }),
      };
    }

    try {
      const templateParams = {
        to_email: recipientEmail,
        recipient_name: recipientName,
        recipient_type: recipientType,
        sender_name: SENDER_NAME,
        sender_email: SENDER_EMAIL,
        closure_date: new Date().toLocaleDateString('en-ZA', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        current_year: new Date().getFullYear(),
      };

      console.log('📧 Sending adjudication closure notification email:', {
        to_email: templateParams.to_email,
        recipient_name: templateParams.recipient_name,
        recipient_type: templateParams.recipient_type,
        sender: SENDER_EMAIL,
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_CLOSURE_TEMPLATE_ID,
      });

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_CLOSURE_TEMPLATE_ID,
        templateParams
      );

      console.log(`✓ Adjudication closure email sent to ${recipientEmail}`, { status: response.status });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          email: recipientEmail,
          recipientType: recipientType,
          messageId: response.status === 200 ? 'sent' : 'failed',
        }),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const fullError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`✗ Failed to send adjudication closure email to ${recipientEmail}:`, {
        error: errorMsg,
        errorStack: fullError.stack,
        errorDetails: String(error),
        recipientEmail,
        recipientType,
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_CLOSURE_TEMPLATE_ID,
      });
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          email: recipientEmail,
          error: errorMsg,
          debug: {
            hasServiceId: !!EMAILJS_SERVICE_ID,
            hasClosureTemplateId: !!EMAILJS_CLOSURE_TEMPLATE_ID,
            hasPublicKey: !!EMAILJS_PUBLIC_KEY,
            hasPrivateKey: !!EMAILJS_PRIVATE_KEY,
            errorStack: fullError.stack,
          },
        }),
      };
    }
  } catch (error) {
    console.error('Error in send-adjudication-closure function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
