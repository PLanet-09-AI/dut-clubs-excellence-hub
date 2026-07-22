# Microsoft Clarity Implementation Audit

**Date:** 2026-07-22  
**Status:** ⚠️ PARTIALLY IMPLEMENTED

---

## Executive Summary

Microsoft Clarity is **installed but NOT fully configured** for user session recording. The tracking script is present, but critical session identification and recording features are missing.

### Key Findings:
- ✅ Clarity script tag is injected
- ⚠️ User session IDs are NOT being registered with Clarity
- ⚠️ Session recording is NOT enabled
- ✅ Custom audit logging exists but is SEPARATE from Clarity

---

## 1. Current Implementation Status

### 1.1 Clarity Script Installation

**File:** [src/routes/__root.tsx](src/routes/__root.tsx#L104)

```typescript
scripts: [
  {
    children: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "xq5jk6dh16");`,
  },
]
```

**Status:** ✅ Script is present  
**Clarity Project ID:** `xq5jk6dh16`  
**Loading:** Asynchronous (good for performance)

### 1.2 User Session Tracking

**Issue:** No user identification is being sent to Clarity.

**What's Missing:**
```typescript
// NOT IMPLEMENTED - These calls should be made after authentication
window.clarity('set', 'userId', user.uid);  // Identify user
window.clarity('set', 'email', user.email); // Link email
window.clarity('set', 'role', userRole);    // Track role (admin/judge)
```

---

## 2. Existing Session Management

### 2.1 Custom Audit Logging System

**File:** [src/lib/audit-logging-extended.ts](src/lib/audit-logging-extended.ts)

#### Session Tracking Implementation:
- ✅ Session ID generation on app load: `generateSessionId()`
- ✅ Session ID persists across related actions: `getSessionId()`
- ✅ Session can be reset on logout: `resetSessionId()`
- ✅ Logged to Firestore in `audit_logs_extended` collection

#### Captured Data Per Session:
```typescript
{
  id: string;              // Firestore doc ID
  action: string;          // Specific action (e.g., 'VIEWED_NOMINATIONS')
  userRole: 'admin' | 'judge';
  userUid: string;
  userEmail: string;
  timestamp: Timestamp;
  description: string;
  module: string;          // e.g., 'nominations', 'judge_scoring'
  affectedResourceId?: string;
  affectedCount?: number;
  metadata?: Record<string, any>;
  sessionId: string;       // Links related actions
  userAgent: string;
  ipAddress: string;       // Currently 'N/A'
  status: 'success' | 'failure';
  errorMessage?: string;
}
```

#### Tracked Actions:

**Admin Actions:**
- VIEWED_NOMINATIONS
- VIEWED_NOMINATION_DETAIL
- FILTERED_NOMINATIONS
- SEARCHED_NOMINATIONS
- VIEWED_SHORTLISTED
- VIEWED_REJECTED
- VIEWED_JUDGE_ACTIVITY
- VIEWED_LEADERBOARD
- ACCESSED_SETTINGS
- VIEWED_AUDIT_LOGS
- EXPORTED_DATA
- CHANGED_NOMINATION_STATUS
- SENT_REMINDER_EMAIL
- MANAGED_CATEGORIES
- MANAGED_WINNERS
- PASSWORD_RESET

**Judge Actions:**
- VIEWED_SHORTLISTED
- VIEWED_NOMINATION_FOR_SCORING
- SUBMITTED_SCORE
- VIEWED_OWN_SCORES
- VIEWED_LEADERBOARD
- ACCESSED_JUDGE_GUIDE
- PASSWORD_RESET

---

## 3. User Authentication Flow

### 3.1 Authentication Implementation

**File:** [src/lib/auth-firebase.ts](src/lib/auth-firebase.ts)

#### Current Flow:
1. User signs in with email/password
2. Firebase Auth validates credentials
3. Custom claims checked for role (admin/judge)
4. User navigated to appropriate dashboard

#### User Data Available After Login:
```typescript
{
  uid: string;           // Firebase UID
  email: string;         // User email
  displayName?: string;
  customClaims: {
    role: 'admin' | 'judge'
  }
}
```

### 3.2 Integration Points - Where Clarity Should Be Called

#### **Location 1:** [src/routes/admin.tsx](src/routes/admin.tsx#L353-L370) - Admin Dashboard

```typescript
useEffect(() => {
  const unsub = subscribeToAuthState(async (user) => {
    if (user) {
      setCurrentUser(user);
      // ⚠️ MISSING: window.clarity calls here
      
      const idTokenResult = await user.getIdTokenResult();
      const role = idTokenResult.claims?.role as 'admin' | 'judge' | undefined;
      
      if (role === 'admin' || role === 'judge') {
        setUserRole(role);
        setAuthed(true);
        return;
      }
    }
  });
}, [navigate]);
```

#### **Location 2:** [src/routes/judge.tsx](src/routes/judge.tsx#L220-L240) - Judge Dashboard

```typescript
useEffect(() => {
  const unsub = subscribeToAuthState(async (user) => {
    if (user) {
      setCurrentUser(user);
      // ⚠️ MISSING: window.clarity calls here
      
      const idTokenResult = await user.getIdTokenResult();
      const role = idTokenResult.claims?.role as 'admin' | 'judge' | undefined;
      
      if (role === 'judge') {
        // ...
      }
    }
  });
}, [navigate]);
```

#### **Location 3:** [src/routes/leaderboard.tsx](src/routes/leaderboard.tsx#L309-L330) - Leaderboard Page

```typescript
useEffect(() => {
  const unsub = subscribeToAuthState(async (user) => {
    if (user) {
      // ⚠️ MISSING: window.clarity calls here
      
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.data();
      if (data?.role === "judge" || data?.role === "admin") {
        setRole(data.role as string);
        setAuthed(true);
      }
    }
  });
}, [navigate]);
```

#### **Location 4:** Logout - [src/routes/admin.tsx](src/routes/admin.tsx) & [src/routes/judge.tsx](src/routes/judge.tsx)

```typescript
// ⚠️ MISSING: When user logs out
const handleLogout = async () => {
  setLoggingOut(true);
  try {
    // Should call: window.clarity('set', 'userId', '');
    // Should call: resetSessionId();
    
    await firebaseSignOut();
    navigate({ to: '/' });
  } finally {
    setLoggingOut(false);
  }
};
```

---

## 4. Gap Analysis

### 4.1 What's NOT Implemented

| Feature | Status | Impact |
|---------|--------|--------|
| User identification to Clarity | ❌ Missing | Session recordings won't be linked to users |
| Role tracking in Clarity | ❌ Missing | Can't analyze admin vs judge behavior separately |
| Session recording link | ❌ Missing | Manual correlation needed between Firestore and Clarity |
| Logout session cleanup | ❌ Missing | Session ID persists across logout |
| Event tracking to Clarity | ❌ Missing | Page views/events only recorded in Firestore |
| Error logging to Clarity | ❌ Missing | Clarity doesn't capture application errors |
| Performance metrics sync | ❌ Missing | Clarity metrics isolated from application logs |

### 4.2 Dual System Problem

**Current Architecture:**
```
User Action
├── Firebase Audit Logs (Firestore)
│   └── Custom session tracking
│       └── Detailed action logging
└── Clarity (Separate System)
    └── No user identification
    └── No session linking
```

**Result:** Two independent monitoring systems with no correlation

---

## 5. Recommendations

### Priority 1: Critical (User Session Recording)

**Create new file:** `src/lib/clarity-integration.ts`

```typescript
/**
 * Microsoft Clarity Integration
 * Links user authentication with Clarity session recording
 */

export function initializeClarityUser(userId: string, email: string, role: 'admin' | 'judge') {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('set', 'userId', userId);
    window.clarity('set', 'email', email);
    window.clarity('set', 'role', role);
    console.log('[Clarity] User identified:', { userId, email, role });
  }
}

export function clearClarityUser() {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('set', 'userId', '');
    window.clarity('set', 'email', '');
    window.clarity('set', 'role', '');
    console.log('[Clarity] User session cleared');
  }
}

export function trackClarityEvent(eventName: string, metadata?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('event', eventName, metadata);
  }
}
```

### Priority 2: Important (Session Correlation)

**Modify:** [src/lib/audit-logging-extended.ts](src/lib/audit-logging-extended.ts)

Add Clarity event emission:
```typescript
export async function logModuleInteraction(log: Omit<ExtendedAuditLog, 'id' | 'timestamp' | 'userUid' | 'userEmail' | 'sessionId'>): Promise<string | null> {
  // ... existing code ...
  
  // Add Clarity tracking
  trackClarityEvent(`${log.module}:${log.action}`, {
    sessionId: currentSessionId,
    module: log.module,
    status: log.status,
  });
  
  // ... rest of code ...
}
```

### Priority 3: Enhancement (Observability)

Add type definition:
```typescript
// src/lib/clarity.d.ts
interface Window {
  clarity: (method: string, ...args: any[]) => void;
}
```

---

## 6. Implementation Checklist

- [ ] Create `src/lib/clarity-integration.ts` with user identification functions
- [ ] Update `src/routes/admin.tsx` - call `initializeClarityUser()` after auth
- [ ] Update `src/routes/judge.tsx` - call `initializeClarityUser()` after auth
- [ ] Update `src/routes/leaderboard.tsx` - call `initializeClarityUser()` after auth
- [ ] Add `clearClarityUser()` to all logout handlers
- [ ] Link Clarity events to audit log entries via sessionId
- [ ] Add Clarity TypeScript type definitions
- [ ] Test session recording in Clarity dashboard
- [ ] Document Clarity dashboard access for stakeholders
- [ ] Set up Clarity session replay filtering for PII

---

## 7. Clarity Dashboard Links

- **Project ID:** `xq5jk6dh16`
- **Dashboard:** https://www.clarity.ms/dashboard

### Recommended Setup:
1. Enable heatmaps and session recording
2. Set retention to 90 days minimum
3. Configure PII masking for nominations data
4. Create custom event tracking for scoring actions
5. Set up alerts for errors > 1% of sessions

---

## References

- **Clarity Docs:** https://clarity.microsoft.com/docs/
- **Clarity API:** https://clarity.microsoft.com/docs/api-reference
- **setUserId():** https://clarity.microsoft.com/docs/api-reference#user-identification
- **Session Recording:** https://clarity.microsoft.com/docs/setup#session-recording

---

**Next Step:** Run `/gsd-plan-phase` to create implementation plan for Clarity session recording integration.
