import { useState, useEffect } from "react";
import {
  AlertCircle,
  Mail,
  Copy,
  Check,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { logPasswordReset } from "@/lib/audit-logging-extended";

interface ForcePasswordChangeModalProps {
  user: User;
  usedTempPassword: boolean;
  onPasswordChanged: () => void;
}

export function ForcePasswordChangeModal({
  user,
  usedTempPassword,
  onPasswordChanged,
}: ForcePasswordChangeModalProps) {
  const [method, setMethod] = useState<"reset-email" | "direct-change">("reset-email");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [resetLink, setResetLink] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copiedResetLink, setCopiedResetLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Must contain uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Must contain lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Must contain a number";
    if (!/[!@#$%^&*]/.test(pwd)) return "Must contain special character (!@#$%^&*)";
    return null;
  };

  // Step 1: Send password reset email
  async function handleSendResetEmail() {
    setError("");
    setLoading(true);
    try {
      // Get the reset link (Firebase doesn't return the link directly,
      // so we'll show the email-based reset instead)
      await sendPasswordResetEmail(auth, user.email || "");
      setResetEmail(user.email || "");
      setResetLinkSent(true);
      setSuccess("Password reset email sent! Check your inbox.");
      
      // Determine user role and log the action
      const idTokenResult = await user.getIdTokenResult();
      const role = (idTokenResult.claims?.role as 'admin' | 'judge') || 'judge';
      await logPasswordReset(role, 'email');
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Handle direct password change (without email)
  async function handleDirectPasswordChange() {
    setError("");

    // Validate
    if (!currentPassword) {
      setError("Enter your current password");
      return;
    }
    if (!newPassword) {
      setError("Enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate with current password
      const credential = EmailAuthProvider.credential(
        user.email || "",
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      setSuccess("Password changed successfully!");
      
      // Determine user role and log the action
      const idTokenResult = await user.getIdTokenResult();
      const role = (idTokenResult.claims?.role as 'admin' | 'judge') || 'judge';
      await logPasswordReset(role, 'direct');
      
      setTimeout(() => {
        onPasswordChanged();
      }, 1500);
    } catch (err: any) {
      setError(
        err.code === "auth/wrong-password"
          ? "Current password is incorrect"
          : err.message || "Failed to change password"
      );
    } finally {
      setLoading(false);
    }
  }

  // Generate a helper message with email link instructions
  function generateEmailResetInstructions() {
    const resetPageUrl = `${window.location.origin}`;
    return `Password reset link has been sent to ${user.email}. You can also manually navigate to your email, click the reset link, and set a new password from there.`;
  }

  if (!usedTempPassword) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-white shadow-2xl">
        <div className="p-6 border-b border-destructive/20 bg-destructive/5">
          <div className="flex gap-3 items-start">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Change Your Password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You logged in with a temporary password. Please change it now to secure your account.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Method Selection */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => {
                setMethod("reset-email");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 px-3 rounded-lg border-2 transition font-medium text-sm ${
                method === "reset-email"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-muted bg-white text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <Mail className="h-4 w-4 inline mr-2" />
              Reset via Email
            </button>
            <button
              onClick={() => {
                setMethod("direct-change");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 px-3 rounded-lg border-2 transition font-medium text-sm ${
                method === "direct-change"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-muted bg-white text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              Change Directly
            </button>
          </div>

          {/* Method 1: Email Reset */}
          {method === "reset-email" && (
            <div className="space-y-4">
              {!resetLinkSent ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    We'll send a password reset link to your email. Click the link to set a new password.
                  </p>
                  <Button
                    onClick={handleSendResetEmail}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Reset Link to {user.email}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex gap-2 items-start">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900">Email sent!</p>
                        <p className="text-sm text-green-800 mt-1">
                          Check your inbox at <strong>{user.email}</strong> for a password reset link.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-900 font-medium mb-2">
                      📧 Reset link steps:
                    </p>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Open the email from noreply@firebase.com</li>
                      <li>Click the password reset link</li>
                      <li>Enter your new password (must be 8+ chars with uppercase, lowercase, number, special character)</li>
                      <li>Click reset password</li>
                      <li>Return here and log in with your new password</li>
                    </ol>
                  </div>

                  <Button
                    onClick={() => {
                      setResetLinkSent(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Send another link
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Method 2: Direct Change */}
          {method === "direct-change" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your current temporary password and your new secure password below.
              </p>

              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-pwd" className="font-medium">
                  Current Password (TempPassword@2026)
                </Label>
                <div className="relative">
                  <Input
                    id="current-pwd"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter temporary password"
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-pwd" className="font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-pwd"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a strong password"
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  8+ chars • Uppercase • Lowercase • Number • Special character (!@#$%^&*)
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-pwd" className="font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-pwd"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleDirectPasswordChange}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </div>
          )}

          {/* Error & Success Messages */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm font-medium text-destructive flex gap-2 items-center">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm font-medium text-green-900 flex gap-2 items-center">
                <Check className="h-4 w-4 flex-shrink-0" />
                {success}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-muted/20 text-xs text-muted-foreground">
          <p>
            🔒 Your password is encrypted and never stored in plain text. You must change your temporary password to continue using the system.
          </p>
        </div>
      </Card>
    </div>
  );
}
