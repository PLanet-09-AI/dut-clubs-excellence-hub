/**
 * Hook for tracking admin and judge module interactions
 * 
 * Automatically logs every navigation, view, filter, and action
 * with minimal boilerplate in components
 */

import { useEffect } from 'react';
import { logModuleInteraction, AdminModuleAction, JudgeModuleAction } from '@/lib/audit-logging-extended';
import { auth } from '@/lib/firebase';

interface UseTrackInteractionOptions {
  module: string;
  action: AdminModuleAction | JudgeModuleAction;
  description: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  trackImmediately?: boolean; // log on mount if true
}

/**
 * Track a module interaction (view, filter, search, action, etc.)
 * 
 * @example
 * // In a nominations list component
 * useTrackInteraction({
 *   module: 'nominations',
 *   action: 'VIEWED_NOMINATIONS',
 *   description: 'Opened nominations list',
 *   trackImmediately: true,
 * });
 */
export function useTrackInteraction({
  module,
  action,
  description,
  resourceId,
  metadata,
  trackImmediately = true,
}: UseTrackInteractionOptions) {
  
  useEffect(() => {
    if (!trackImmediately || !auth.currentUser) return;

    // Determine user role from custom claims or email domain
    const getUserRole = async (): Promise<'admin' | 'judge'> => {
      try {
        const idTokenResult = await auth.currentUser?.getIdTokenResult(true);
        return idTokenResult?.claims?.role as 'admin' | 'judge' || 'judge';
      } catch {
        return 'judge';
      }
    };

    (async () => {
      const userRole = await getUserRole();
      await logModuleInteraction({
        module,
        action,
        description,
        affectedResourceId: resourceId,
        userRole,
        metadata,
        status: 'success',
      });
    })();
  }, [module, action, description, resourceId, trackImmediately]);
}

/**
 * Track a user action with error handling
 * 
 * @example
 * const { trackAction } = useTrackAction({
 *   module: 'nominations',
 *   userRole: 'admin',
 * });
 * 
 * await trackAction(
 *   'CHANGED_NOMINATION_STATUS',
 *   'Changed nomination to shortlisted',
 *   nominationId
 * );
 */
export function useTrackAction(options: { module: string; userRole?: 'admin' | 'judge' }) {
  const trackAction = async (
    action: AdminModuleAction | JudgeModuleAction,
    description: string,
    resourceId?: string,
    metadata?: Record<string, any>,
  ) => {
    try {
      if (!auth.currentUser) {
        console.warn('[Audit] No authenticated user for tracking');
        return;
      }

      const userRole = options.userRole || 'judge';

      await logModuleInteraction({
        module: options.module,
        action,
        description,
        affectedResourceId: resourceId,
        userRole,
        metadata,
        status: 'success',
      });
    } catch (error) {
      console.error('[Audit] Failed to track action:', error);
    }
  };

  return { trackAction };
}
