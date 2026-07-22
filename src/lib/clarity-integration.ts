/**
 * Microsoft Clarity Integration
 * Links user authentication with Clarity session recording
 * 
 * Clarity Project ID: xq5jk6dh16
 * Dashboard: https://www.clarity.ms/dashboard
 */

/**
 * Initialize Clarity with authenticated user data
 * Identifies the user session so recordings are linked to user context
 * 
 * @param userId - Firebase UID
 * @param email - User email address
 * @param role - User role (admin or judge)
 */
export function initializeClarityUser(userId: string, email: string, role: 'admin' | 'judge'): void {
  if (typeof window !== 'undefined' && (window as any).clarity) {
    try {
      (window as any).clarity('set', 'userId', userId);
      (window as any).clarity('set', 'email', email);
      (window as any).clarity('set', 'role', role);
      console.log('[Clarity] User identified:', { userId, email, role });
    } catch (error) {
      console.warn('[Clarity] Failed to set user context:', error);
    }
  }
}

/**
 * Clear Clarity user context on logout
 * Stops recording session data for the logged-out user
 */
export function clearClarityUser(): void {
  if (typeof window !== 'undefined' && (window as any).clarity) {
    try {
      (window as any).clarity('set', 'userId', '');
      (window as any).clarity('set', 'email', '');
      (window as any).clarity('set', 'role', '');
      console.log('[Clarity] User session cleared');
    } catch (error) {
      console.warn('[Clarity] Failed to clear user context:', error);
    }
  }
}

/**
 * Track a custom event in Clarity
 * Links specific application actions to session recording
 * 
 * @param eventName - Name of the event (e.g., 'nomination:submitted', 'score:saved')
 * @param metadata - Optional metadata to associate with the event
 */
export function trackClarityEvent(eventName: string, metadata?: Record<string, any>): void {
  if (typeof window !== 'undefined' && (window as any).clarity) {
    try {
      if (metadata) {
        (window as any).clarity('event', eventName, JSON.stringify(metadata));
      } else {
        (window as any).clarity('event', eventName);
      }
      console.log('[Clarity] Event tracked:', { eventName, metadata });
    } catch (error) {
      console.warn('[Clarity] Failed to track event:', error);
    }
  }
}
