/**
 * Extended Audit Logging Service
 * 
 * Tracks all admin and judge interactions with detailed module tracking.
 * Segregates audit logs by user role (admin vs judge) for clear accountability.
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

export type AdminModuleAction =
  | 'VIEWED_NOMINATIONS'
  | 'VIEWED_NOMINATION_DETAIL'
  | 'FILTERED_NOMINATIONS'
  | 'SEARCHED_NOMINATIONS'
  | 'VIEWED_SHORTLISTED'
  | 'VIEWED_REJECTED'
  | 'VIEWED_JUDGE_ACTIVITY'
  | 'VIEWED_LEADERBOARD'
  | 'ACCESSED_SETTINGS'
  | 'VIEWED_AUDIT_LOGS'
  | 'EXPORTED_DATA'
  | 'CHANGED_NOMINATION_STATUS'
  | 'SENT_REMINDER_EMAIL'
  | 'MANAGED_CATEGORIES'
  | 'MANAGED_WINNERS'
  | 'PASSWORD_RESET';

export type JudgeModuleAction =
  | 'VIEWED_SHORTLISTED'
  | 'VIEWED_NOMINATION_FOR_SCORING'
  | 'SUBMITTED_SCORE'
  | 'VIEWED_OWN_SCORES'
  | 'VIEWED_LEADERBOARD'
  | 'ACCESSED_JUDGE_GUIDE'
  | 'PASSWORD_RESET';

export interface ExtendedAuditLog {
  id?: string;
  action: AdminModuleAction | JudgeModuleAction;
  userRole: 'admin' | 'judge';
  userUid: string;
  userEmail: string;
  timestamp: any;
  description: string;
  module: string; // e.g., 'nominations', 'judge_scoring', 'settings'
  affectedResourceId?: string; // e.g., nomination ID being viewed
  affectedCount?: number;
  metadata?: Record<string, any>;
  sessionId?: string; // Track session for related actions
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

let currentSessionId: string = generateSessionId();

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getSessionId(): string {
  return currentSessionId;
}

export function resetSessionId(): void {
  currentSessionId = generateSessionId();
}

/**
 * Log any admin or judge module interaction
 */
export async function logModuleInteraction(log: Omit<ExtendedAuditLog, 'id' | 'timestamp' | 'userUid' | 'userEmail' | 'sessionId'>): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('[Audit] No authenticated user for audit logging');
      return null;
    }

    const auditEntry: ExtendedAuditLog = {
      ...log,
      userUid: user.uid,
      userEmail: user.email ?? 'unknown',
      timestamp: serverTimestamp(),
      sessionId: currentSessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      ipAddress: 'N/A',
    };

    const docRef = await addDoc(collection(db, 'audit_logs_extended'), auditEntry);
    console.log(`[Audit] ${log.action} by ${log.userRole} logged`, { module: log.module, resourceId: log.affectedResourceId });
    return docRef.id;
  } catch (error) {
    console.error('[Audit] Failed to log module interaction:', error);
    return null;
  }
}

/**
 * Get audit logs for a specific user role (admin or judge)
 */
export async function getAuditLogsByRole(
  role: 'admin' | 'judge',
  limitCount: number = 100,
): Promise<ExtendedAuditLog[]> {
  try {
    const q = query(
      collection(db, 'audit_logs_extended'),
      where('userRole', '==', role),
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ExtendedAuditLog[];
  } catch (error) {
    console.error('[Audit] Failed to fetch audit logs by role:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getAuditLogsByUser(
  userEmail: string,
  limitCount: number = 50,
): Promise<ExtendedAuditLog[]> {
  try {
    const q = query(
      collection(db, 'audit_logs_extended'),
      where('userEmail', '==', userEmail),
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ExtendedAuditLog[];
  } catch (error) {
    console.error('[Audit] Failed to fetch audit logs by user:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific module
 */
export async function getAuditLogsByModule(
  module: string,
  limitCount: number = 100,
): Promise<ExtendedAuditLog[]> {
  try {
    const q = query(
      collection(db, 'audit_logs_extended'),
      where('module', '==', module),
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ExtendedAuditLog[];
  } catch (error) {
    console.error('[Audit] Failed to fetch audit logs by module:', error);
    return [];
  }
}

/**
 * Get recent activity summary for dashboard
 */
export async function getRecentActivitySummary(limitCount: number = 50): Promise<{
  adminActions: ExtendedAuditLog[];
  judgeActions: ExtendedAuditLog[];
}> {
  try {
    const adminQ = query(
      collection(db, 'audit_logs_extended'),
      where('userRole', '==', 'admin'),
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    );
    const judgeQ = query(
      collection(db, 'audit_logs_extended'),
      where('userRole', '==', 'judge'),
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    );

    const [adminSnapshot, judgeSnapshot] = await Promise.all([getDocs(adminQ), getDocs(judgeQ)]);

    return {
      adminActions: adminSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ExtendedAuditLog[],
      judgeActions: judgeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ExtendedAuditLog[],
    };
  } catch (error) {
    console.error('[Audit] Failed to fetch recent activity:', error);
    return { adminActions: [], judgeActions: [] };
  }
}

/**
 * Log password reset event
 */
export async function logPasswordReset(
  userRole: 'admin' | 'judge',
  method: 'email' | 'direct',
): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('[Audit] No authenticated user for password reset logging');
      return null;
    }

    const methodDescription = method === 'email' ? 'Reset via Email Link' : 'Changed Directly in App';

    return await logModuleInteraction({
      action: 'PASSWORD_RESET',
      userRole,
      description: `Password reset using ${methodDescription} method`,
      module: 'security',
      metadata: {
        method,
        resetType: 'temporary_to_permanent',
      },
      status: 'success',
    });
  } catch (error) {
    console.error('[Audit] Failed to log password reset:', error);
    return null;
  }
}
