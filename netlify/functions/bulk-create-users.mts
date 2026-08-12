/**
 * Netlify Function: Bulk Create Admin & Judge Accounts
 *
 * Creates Firebase Auth accounts for admins and judges with password reset links.
 * Each user gets a password reset email so they can set their own password.
 *
 * Deploy: netlify functions:create --name bulk-create-users
 * Usage: Call POST /.netlify/functions/bulk-create-users with admin auth token
 *
 * Request body:
 * {
 *   "users": [
 *     { "email": "user@dut.ac.za", "role": "admin", "displayName": "John Doe" },
 *     { "email": "judge@dut.ac.za", "role": "judge", "displayName": "Jane Smith" }
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "created": [{ "email": "user@dut.ac.za", "uid": "...", "resetLink": "..." }],
 *   "errors": [{ "email": "existing@dut.ac.za", "error": "User already exists" }],
 *   "message": "3 users created, 1 error"
 * }
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import emailjs from '@emailjs/nodejs';
import type { Handler } from '@netlify/functions';
import { getAuthService } from './firebase-admin-init';

// Firebase Admin will be initialized in the handler
let auth: any = null;

function initializeFirebase() {
  if (auth) return; // Already initialized
  auth = getAuthService();
  } catch (error) {
    throw new Error(`Failed to initialize Firebase: ${error}`);
  }
}

// EmailJS config
const EMAILJS_PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || '';
const EMAILJS_SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID || '';

interface UserInput {
  email: string;
  role: 'admin' | 'judge';
  displayName: string;
}

interface CreatedUser {
  email: string;
  uid: string;
  displayName: string;
  role: string;
  passwordResetLink: string;
}

interface UserError {
  email: string;
  displayName: string;
  error: string;
}

interface BulkCreateResponse {
  success: boolean;
  created: CreatedUser[];
  errors: UserError[];
  message: string;
}

/**
 * Generate password reset link using the password reset email action
 */
async function generatePasswordResetLink(email: string): Promise<string> {
  try {
    const resetLink = await auth.generatePasswordResetLink(email);
    return resetLink;
  } catch (error) {
    console.error(`Failed to generate reset link for ${email}:`, error);
    throw error;
  }
}

/**
 * Send invitation email with password reset link
 */
async function sendInvitationEmail(
  email: string,
  displayName: string,
  role: string,
  resetLink: string
): Promise<void> {
  if (!EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY || !EMAILJS_SERVICE_ID) {
    console.warn('EmailJS not configured, skipping email send');
    return;
  }

  try {
    emailjs.init({
      publicKey: EMAILJS_PUBLIC_KEY,
      privateKey: EMAILJS_PRIVATE_KEY,
    });

    const roleDisplay = role === 'admin' ? 'Administrator' : 'Judge';

    await emailjs.send(EMAILJS_SERVICE_ID, 'template_bulk_invite', {
      to_email: email,
      to_name: displayName,
      user_role: roleDisplay,
      reset_link: resetLink,
      support_email: 'awards@dut.ac.za',
    });

    console.log(`Invitation email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send invitation email to ${email}:`, error);
    throw error;
  }
}

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Initialize Firebase on first request
    initializeFirebase();

    const { users } = JSON.parse(event.body || '{}') as { users: UserInput[] };

    if (!users || !Array.isArray(users) || users.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing or invalid users array',
          example: {
            users: [
              {
                email: 'admin@dut.ac.za',
                role: 'admin',
                displayName: 'John Doe',
              },
            ],
          },
        }),
      };
    }

    const created: CreatedUser[] = [];
    const errors: UserError[] = [];

    // Process each user
    for (const user of users) {
      try {
        if (!user.email || !user.role || !user.displayName) {
          errors.push({
            email: user.email || 'unknown',
            displayName: user.displayName || 'unknown',
            error: 'Missing email, role, or displayName',
          });
          continue;
        }

        // Create user with temporary password (they'll reset it)
        const temporaryPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

        const userRecord = await auth.createUser({
          email: user.email,
          password: temporaryPassword,
          displayName: user.displayName,
          emailVerified: false,
        });

        // Set custom claims for role
        await auth.setCustomUserClaims(userRecord.uid, {
          role: user.role,
        });

        // Generate password reset link
        const resetLink = await generatePasswordResetLink(user.email);

        // Send invitation email
        await sendInvitationEmail(user.email, user.displayName, user.role, resetLink);

        created.push({
          email: user.email,
          uid: userRecord.uid,
          displayName: user.displayName,
          role: user.role,
          passwordResetLink: resetLink,
        });

        console.log(`✓ Created user: ${user.email} (${user.role})`);
      } catch (error: any) {
        let errorMessage = 'Unknown error';

        if (error?.code === 'auth/email-already-exists') {
          errorMessage = 'User already exists';
        } else if (error?.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email format';
        } else if (error?.message) {
          errorMessage = error.message;
        }

        errors.push({
          email: user.email,
          displayName: user.displayName,
          error: errorMessage,
        });

        console.error(`✗ Failed to create user ${user.email}:`, errorMessage);
      }
    }

    const response: BulkCreateResponse = {
      success: errors.length === 0,
      created,
      errors,
      message: `${created.length} user(s) created successfully${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`,
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response, null, 2),
    };
  } catch (error: any) {
    console.error('Bulk create users error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
      }),
    };
  }
};
