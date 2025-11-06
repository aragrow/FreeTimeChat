/**
 * Login Page Tests
 *
 * Comprehensive tests for the login page component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage from '../page';

// Mock fetch
global.fetch = jest.fn();

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('LoginPage', () => {
  let mockPush: jest.Mock;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();

    // Clear sessionStorage
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the login page with all elements', () => {
      render(<LoginPage />);

      // Check header
      expect(screen.getByText('FreeTimeChat')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();

      // Check form fields
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Check buttons
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      const googleButton = screen.getByRole('button', { name: '' });
      expect(googleButton).toBeInTheDocument();

      // Check links
      expect(screen.getByText(/create a new account/i)).toBeInTheDocument();
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
      expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });

    it('renders email and password inputs', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('name', 'password');
    });

    it('renders remember me checkbox', () => {
      render(<LoginPage />);

      const checkbox = screen.getByLabelText(/remember me/i);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });
  });

  describe('Form Validation', () => {
    it('validates required email field', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('validates required password field', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('clears validation errors when user types', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Trigger validation error
      await user.click(submitButton);
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();

      // Start typing
      await user.type(emailInput, 'test@example.com');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid credentials', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            user: { id: '1', email: 'test@example.com' },
          },
        }),
      } as Response);

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/auth/login',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'Password123!',
            }),
          })
        );
      });

      expect(mockPush).toHaveBeenCalledWith('/chat');
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: Response) => void;
      const promise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(promise);

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      // Check that inputs are disabled during loading
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ data: { user: {} } }),
      } as Response);

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
      });
    });

    it('handles login failure with general error', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'Invalid credentials',
        }),
      } as Response);

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword');
      await user.click(submitButton);

      expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles login failure with field-specific errors', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          errors: [
            { field: 'email', message: 'User not found' },
            { field: 'password', message: 'Incorrect password' },
          ],
        }),
      } as Response);

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword');
      await user.click(submitButton);

      expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
      expect(await screen.findByText(/incorrect password/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles network errors', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      expect(await screen.findByText(/an unexpected error occurred/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Two-Factor Authentication', () => {
    it('redirects to 2FA verification when required', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            requires2FA: true,
            token: 'temp-token-123',
          },
        }),
      } as Response);

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(sessionStorage.getItem('temp2FAToken')).toBe('temp-token-123');
        expect(mockPush).toHaveBeenCalledWith('/2fa/verify');
      });
    });
  });

  describe('Google OAuth', () => {
    it('has Google OAuth button', () => {
      render(<LoginPage />);

      const buttons = screen.getAllByRole('button');
      // There should be at least 2 buttons (Google OAuth + Sign In)
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      // First button is the Google OAuth button
      const googleButton = buttons[0];
      expect(googleButton).toBeInTheDocument();
      expect(googleButton).toHaveAttribute('type', 'button');
    });

    it('disables Google button when form is loading', async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: Response) => void;
      const promise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(promise);

      render(<LoginPage />);

      // Start form submission
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      // Google button should be disabled during loading
      const buttons = screen.getAllByRole('button');
      const googleButton = buttons[0];
      expect(googleButton).toBeDisabled();

      // Cleanup
      resolvePromise!({
        ok: true,
        json: async () => ({ data: { user: {} } }),
      } as Response);
    });
  });

  describe('Navigation', () => {
    it('has link to register page', () => {
      render(<LoginPage />);

      const registerLink = screen.getByText(/create a new account/i).closest('a');
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('has link to forgot password page', () => {
      render(<LoginPage />);

      const forgotPasswordLink = screen.getByText(/forgot password/i).closest('a');
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    });

    it('has links to terms and privacy pages', () => {
      render(<LoginPage />);

      const termsLink = screen.getByText(/terms of service/i).closest('a');
      const privacyLink = screen.getByText(/privacy policy/i).closest('a');

      expect(termsLink).toHaveAttribute('href', '/terms');
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form inputs', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('has proper autocomplete attributes', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('marks inputs as required', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });
  });
});
