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

/**
 * Build a professional HTML email template
 */
function buildEmailTemplate(
  nominatorName: string,
  nomineeName: string,
  categoryName: string,
  incompleteItemsHtml: string,
  submissionUrl: string,
  currentYear: number
): string {
  return `
<div style="font-family: 'Inter', system-ui, sans-serif; font-size: 15px; line-height: 1.6; background-color: #f5f5f5">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px">
    <!-- Header with theme colors -->
    <div style="background: linear-gradient(135deg, #d4a574 0%, #dab68f 100%); padding: 32px 24px; border-radius: 12px; text-align: center; margin-bottom: 24px">
      <h1 style="margin: 0; color: #1a2b4a; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; letter-spacing: -0.02em">
        DUT SALEA 2026 Excellence Awards
      </h1>
      <p style="margin: 8px 0 0 0; color: #2a3f5f; font-size: 14px">Complete Your Nomination</p>
    </div>

    <!-- Main content -->
    <div style="background: white; padding: 32px 24px; border-radius: 8px; border: 1px solid #e8e8e8">
      <!-- Greeting -->
      <p style="margin: 0 0 16px 0; color: #1a2b4a; font-size: 16px">
        Hello <strong>${nominatorName}</strong>,
      </p>

      <!-- Main message -->
      <p style="margin: 0 0 20px 0; color: #3a4a6a">
        Thank you for nominating <strong>${nomineeName}</strong> for the <strong>${categoryName}</strong> award! 🎉
      </p>

      <p style="margin: 0 0 20px 0; color: #3a4a6a">
        We noticed that your nomination is almost complete, but we're missing some supporting documents to finalize the submission. These documents are essential for the judging panel to properly evaluate the nomination.
      </p>

      <!-- Missing documents section -->
      <div style="background: #fff8f1; border-left: 4px solid #d4a574; padding: 16px; margin: 20px 0; border-radius: 4px">
        <p style="margin: 0 0 12px 0; color: #1a2b4a; font-weight: 600; font-size: 14px">
          📋 Missing Documents:
        </p>
        ${incompleteItemsHtml}
      </div>

      <!-- Call to action -->
      <p style="margin: 0 0 24px 0; color: #3a4a6a">
        Please upload these documents to complete your nomination. It only takes a few minutes!
      </p>

      <!-- Button -->
      <div style="text-align: center; margin: 28px 0">
        <a 
          href="${submissionUrl}"
          target="_blank"
          style="
            display: inline-block;
            background: linear-gradient(135deg, #d4a574 0%, #dab68f 100%);
            color: #362222;
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
          <strong>Need help?</strong> Visit our <a href="${submissionUrl}" style="color: #d4a574; text-decoration: none">nomination guide</a> for step-by-step instructions on uploading documents.
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
        © ${currentYear} DUT SALEA 2026 Excellence Awards. All rights reserved.
      </p>
    </div>
  </div>
</div>
  `;
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
    const incompleteItemsHtml = `<ul style="margin: 0; padding-left: 20px; color: #3a4a6a">
${incompleteItems.map((item: string) => `  <li style="margin-bottom: 10px; line-height: 1.5">${item}</li>`).join('\n')}
</ul>`;

    const submissionUrl = `https://salea2026.netlify.app/nominate/${categoryId}#documents`;
    const currentYear = new Date().getFullYear();

    // Build the professional HTML email
    const emailHtml = buildEmailTemplate(
      nominatorName,
      nomineeName,
      categoryName,
      incompleteItemsHtml,
      submissionUrl,
      currentYear
    );

    try {
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: nomineeEmail,
          html_content: emailHtml,
          nominator_name: nominatorName,
          nominee_name: nomineeName,
          category_name: categoryName,
          submission_url: submissionUrl,
          current_year: currentYear,
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

