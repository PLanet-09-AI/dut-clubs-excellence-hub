// Firebase Auth service — SALEA 2026
// Email/password sign-in, sign-up and sign-out helpers

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./firebase";

/** Register a new admin account with email + password */
export async function registerUser(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

/** Sign in an existing admin with email + password */
export async function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Sign out the current user */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

/** Send a password-reset email */
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

/** Subscribe to auth state changes — returns an unsubscribe function */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/** Get the currently signed-in user (or null) */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
