/**
 * Change Password Component
 * 
 * Allows users to change their password securely.
 * They can either:
 * 1. Enter their old password and new password to change directly
 * 2. Request a password reset email with a Firebase link
 */

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTrackInteraction } from '@/hooks/useTrackInteraction';

export function ChangePassword() {
  useTrackInteraction({
    module: 'settings',
    action: 'ACCESSED_CHANGE_PASSWORD',
    description: 'Opened password change dialog',
    trackImmediately: true,
  });

  const [method, setMethod] = useState<'direct' | 'email'>('direct');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain a special character';
    return null;
  };

  const handleDirectPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (oldPassword === newPassword) {
      setError('New password must be different from old password');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }

      // Reauthenticate user with their old password
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setSuccess('Password changed successfully! You may need to log in again.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      useTrackInteraction({
        module: 'settings',
        action: 'CHANGED_PASSWORD',
        description: 'Successfully changed password',
        trackImmediately: true,
      });

      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      let errorMessage = 'Failed to change password';
      if (err.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (err.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log in again before changing your password';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }

      await sendPasswordResetEmail(auth, user.email);
      setSuccess(`Password reset link sent to ${user.email}. Check your email and click the link to reset your password.`);

      useTrackInteraction({
        module: 'settings',
        action: 'SENT_PASSWORD_RESET_EMAIL',
        description: 'Sent password reset email',
        trackImmediately: true,
      });
    } catch (err: any) {
      let errorMessage = 'Failed to send reset email';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'User not found';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Lock className="h-6 w-6" /> Change Password
        </h2>
        <p className="text-gray-600 text-sm mt-1">Update your account password</p>
      </div>

      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Method Selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMethod('direct')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            method === 'direct'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Lock className="inline h-4 w-4 mr-2" />
          Change Directly
        </button>
        <button
          type="button"
          onClick={() => setMethod('email')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            method === 'email'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Mail className="inline h-4 w-4 mr-2" />
          Email Reset Link
        </button>
      </div>

      {/* Direct Password Change */}
      {method === 'direct' && (
        <Card className="p-6">
          <form onSubmit={handleDirectPasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="old-password">Current Password</Label>
              <div className="relative mt-1">
                <Input
                  id="old-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter your current password"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-900"
                  tabIndex={-1}
                >
                  {showPasswords ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative mt-1">
                <Input
                  id="new-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  disabled={loading}
                  className="pr-10"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Password must contain: uppercase, lowercase, number, special character (!@#$%^&*), min 8 characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  disabled={loading}
                  className="pr-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !oldPassword || !newPassword || !confirmPassword}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        </Card>
      )}

      {/* Email Reset Link */}
      {method === 'email' && (
        <Card className="p-6">
          <div className="space-y-4">
            <p className="text-gray-700">
              We'll send you a password reset link to your email address. Click the link to set a new password.
            </p>
            <Button
              onClick={handlePasswordResetEmail}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Password Requirements Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Password Requirements</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ At least 8 characters</li>
          <li>✓ At least one uppercase letter (A-Z)</li>
          <li>✓ At least one lowercase letter (a-z)</li>
          <li>✓ At least one number (0-9)</li>
          <li>✓ At least one special character (!@#$%^&*)</li>
        </ul>
      </Card>
    </div>
  );
}
