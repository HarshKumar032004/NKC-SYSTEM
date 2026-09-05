'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, RotateCcw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      console.error('Forgot password failed', err);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Check Your Email</CardTitle>
            <CardDescription>
              If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 rounded-md border border-green-200 dark:border-green-900">
              The reset link will expire in 15 minutes. Please check your spam folder if you don't see it.
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={() => router.push('/login')} className="w-full">
              Back to Sign In
            </Button>
            <Button variant="outline" onClick={() => router.push('/forgot-password')} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Send Another Email
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@nkc.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
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