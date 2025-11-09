/**
 * Login Page
 *
 * Handles user authentication with email/password and Google OAuth
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GoogleLogo } from '@/components/icons/GoogleLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [formData, setFormData] = useState({
    tenantKey: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordChangeError, setPasswordChangeError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(
        formData.email,
        formData.password,
        formData.tenantKey || undefined
      );

      if (result.error) {
        setGeneralError(result.error);
        return;
      }

      // Check if password change is required
      if (result.requiresPasswordChange) {
        setPasswordChangeData({
          currentPassword: formData.password,
          newPassword: '',
          confirmPassword: '',
        });
        setShowPasswordChangeModal(true);
        return;
      }

      // Check if 2FA is required
      if (result.requires2FA) {
        router.push('/2fa/verify');
        return;
      }

      // Successful login
      router.push('/chat');
    } catch (error) {
      console.error('Login error:', error);
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');

    // Validate password change
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }

    if (passwordChangeData.newPassword.length < 8) {
      setPasswordChangeError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/change-required-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            currentPassword: passwordChangeData.currentPassword,
            newPassword: passwordChangeData.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setPasswordChangeError(data.message || 'Failed to change password');
        return;
      }

      // Password changed successfully, close modal and show success message
      setShowPasswordChangeModal(false);
      setGeneralError('');
      alert('Password changed successfully! Please login with your new password.');

      // Reset form
      setFormData({
        tenantKey: formData.tenantKey,
        email: formData.email,
        password: '',
      });
      setPasswordChangeData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordChangeError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">FreeTimeChat</h1>
          <h2 className="text-2xl font-semibold text-gray-700">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        <Card className="p-8">
          {generalError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {generalError}
            </div>
          )}

          {/* Google OAuth Button */}
          <div className="mb-6">
            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium"
            >
              <GoogleLogo className="w-5 h-5 flex-shrink-0" />
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="tenantKey" className="block text-sm font-medium text-gray-700 mb-1">
                Tenant Key
                <span className="text-gray-500 font-normal ml-1">(optional for admins)</span>
              </label>
              <Input
                id="tenantKey"
                name="tenantKey"
                type="text"
                autoComplete="off"
                value={formData.tenantKey}
                onChange={handleInputChange}
                error={errors.tenantKey}
                placeholder="TENANT-1234"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full">
              Sign in
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-gray-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </Link>
        </p>
      </div>

      {/* Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Change Password Required</h2>
            <p className="text-sm text-gray-600 mb-6">
              You must change your password before continuing. This is a one-time requirement for
              security purposes.
            </p>

            {passwordChangeError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {passwordChangeError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={passwordChangeData.currentPassword}
                  readOnly
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <Input
                  type="password"
                  value={passwordChangeData.newPassword}
                  onChange={(e) =>
                    setPasswordChangeData({ ...passwordChangeData, newPassword: e.target.value })
                  }
                  placeholder="Enter new password"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={passwordChangeData.confirmPassword}
                  onChange={(e) =>
                    setPasswordChangeData({
                      ...passwordChangeData,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Confirm new password"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" isLoading={isLoading} className="flex-1">
                  Change Password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordChangeModal(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
