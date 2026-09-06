'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

import { Suspense } from 'react';
import { Loading } from '@/components/ui/loading';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<null | boolean>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
      setTokenValid(false);
    } else {
      setTokenValid(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      console.error('Reset password failed', err);
      setError(err.response?.data?.message || 'Invalid or expired reset token. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900">
              {error || 'Please request a new password reset link.'}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={() => router.push('/forgot-password')} className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Request New Reset Link
            </Button>
            <Button variant="outline" onClick={() => router.push('/login')} className="w-full">
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Password Reset Successful</CardTitle>
            <CardDescription>
              Your password has been successfully updated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 rounded-md border border-green-200 dark:border-green-900">
              You can now sign in with your new password.
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={() => router.push('/login')} className="w-full">
              Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const passwordRequirements = [
    { label: 'At least 12 characters', met: newPassword.length >= 12 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'At least one number', met: /[0-9]/.test(newPassword) },
    { label: 'At least one special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below. Make sure it's strong and unique.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

            {newPassword && (
              <div className="space-y-1.5 p-3 bg-muted/50 rounded-md border">
                <p className="text-xs font-medium text-muted-foreground">Password Requirements:</p>
                <ul className="space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs">
                      {req.met ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/50 flex-shrink-0" />
                      )}
                      <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {confirmPassword && newPassword !== confirmPassword && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Passwords do not match</span>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" isLoading={loading}>
              Reset Password
            </Button>
          </CardFooter>
        </form>
        <CardFooter className="flex flex-col gap-2 mt-4">
          <Link href="/login" className="text-sm font-medium text-primary hover:underline text-center">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Loading variant="page" text="Loading reset password module..." />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}