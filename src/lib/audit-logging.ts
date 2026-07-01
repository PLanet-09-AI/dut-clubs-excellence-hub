/**
 * Audit Logging Service
 * 
 * Tracks all admin actions (Create Account, Reset Votes, Reset Nominations, etc.)
 * for security and compliance purposes.
 * 
 * Logged to Firestore collection: audit_logs
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';

export type AuditAction =
  | 'CREATE_ACCOUNT'
  | 'RESET_VOTES'
  | 'RESET_NOMINATIONS'
  | 'EXPORT_RESULTS'
  | 'EXPORT_SHORTLISTED'
  | 'TOGGLE_JUDGING'
  | 'ADD_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'PROMOTE_WINNER'
  | 'DELETE_WINNER'
  | 'REPORT_ISSUE';

export interface AuditLog {
  id?: string;
  action: AuditAction;
  adminUid: string;
  adminEmail: string;
  timestamp: any;
  description: string;
  affectedCount?: number; // e.g., "deleted 5 nominations"
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an admin action to the audit_logs collection
 */
export async function logAuditAction(log: Omit<AuditLog, 'id' | 'timestamp' | 'adminUid' | 'adminEmail'>): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user for audit logging');
    }

    const auditEntry: AuditLog = {
      ...log,
      adminUid: user.uid,
      adminEmail: user.email ?? 'unknown',
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      ipAddress: 'N/A', // IP is server-side, can't get from client
    };

    const docRef = await addDoc(collection(db, 'audit_logs'), auditEntry);
    console.log(`[Audit] ${log.action} logged with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('[Audit] Failed to log action:', error);
    throw error;
  }
}

/**
 * Log account creation
 */
export async function logCreateAccount(
  newAccountEmail: string,
  newAccountRole: 'admin' | 'judge',
): Promise<string> {
  return logAuditAction({
    action: 'CREATE_ACCOUNT',
    description: `Created new ${newAccountRole} account: ${newAccountEmail}`,
    metadata: { email: newAccountEmail, role: newAccountRole },
    status: 'success',
  });
}

/**
 * Log vote reset
 */
export async function logResetVotes(deletedCount: number): Promise<string> {
  return logAuditAction({
    action: 'RESET_VOTES',
    description: `Reset all judge votes - deleted ${deletedCount} score records`,
    affectedCount: deletedCount,
    metadata: { deletedCount },
    status: 'success',
  });
}

/**
 * Log nominations reset
 */
export async function logResetNominations(deletedCount: number, deletedScores: number): Promise<string> {
  return logAuditAction({
    action: 'RESET_NOMINATIONS',
    description: `Reset all nominations - deleted ${deletedCount} nominations and ${deletedScores} judge scores`,
    affectedCount: deletedCount + deletedScores,
    metadata: { deletedNominations: deletedCount, deletedScores },
    status: 'success',
  });
}

/**
 * Log results export
 */
export async function logExportResults(exportedCount: number): Promise<string> {
  return logAuditAction({
    action: 'EXPORT_RESULTS',
    description: `Exported ${exportedCount} judge scores to CSV`,
    affectedCount: exportedCount,
    metadata: { exportedCount, format: 'CSV' },
    status: 'success',
  });
}

/**
 * Log shortlisted export
 */
export async function logExportShortlisted(exportedCount: number): Promise<string> {
  return logAuditAction({
    action: 'EXPORT_SHORTLISTED',
    description: `Exported ${exportedCount} shortlisted nominations to CSV`,
    affectedCount: exportedCount,
    metadata: { exportedCount, format: 'CSV' },
    status: 'success',
  });
}

/**
 * Log judging toggle
 */
export async function logToggleJudging(isActive: boolean): Promise<string> {
  return logAuditAction({
    action: 'TOGGLE_JUDGING',
    description: `${isActive ? 'Activated' : 'Deactivated'} real judging`,
    metadata: { isActive },
    status: 'success',
  });
}

/**
 * Log issue report
 */
export async function logReportIssue(
  issueTitle: string,
  issueCategory: string,
  hasAttachments: boolean,
): Promise<string> {
  return logAuditAction({
    action: 'REPORT_ISSUE',
    description: `Reported issue: ${issueTitle} (Category: ${issueCategory})${hasAttachments ? ' with attachments' : ''}`,
    metadata: { issueTitle, issueCategory, hasAttachments },
    status: 'success',
  });
}

/**
 * Log failed action (error)
 */
export async function logAuditActionError(
  action: AuditAction,
  description: string,
  error: Error,
): Promise<string> {
  return logAuditAction({
    action,
    description,
    status: 'failure',
    errorMessage: error.message,
    metadata: { errorStack: error.stack },
  });
}

/**
 * Retrieve recent audit logs (admin view)
 */
export async function getRecentAuditLogs(limit_count: number = 50): Promise<AuditLog[]> {
  try {
    const q = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(limit_count),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as AuditLog));
  } catch (error) {
    console.error('[Audit] Failed to retrieve logs:', error);
    return [];
  }
}

/**
 * Retrieve audit logs for a specific admin user
 */
export async function getAuditLogsByUser(adminUid: string, limit_count: number = 50): Promise<AuditLog[]> {
  try {
    const q = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(limit_count),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as AuditLog))
      .filter((log) => log.adminUid === adminUid);
  } catch (error) {
    console.error('[Audit] Failed to retrieve user logs:', error);
    return [];
  }
}
