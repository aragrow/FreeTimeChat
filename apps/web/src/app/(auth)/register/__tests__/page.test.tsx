/**
 * Register Page Tests
 *
 * Comprehensive tests for the registration page component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import RegisterPage from '../page';

// Mock fetch
global.fetch = jest.fn();

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('RegisterPage', () => {
  let mockPush: jest.Mock;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the register page with all elements', () => {
      render(<RegisterPage />);

      // Check header
      expect(screen.getByText('FreeTimeChat')).toBeInTheDocument();
      expect(screen.getByText('Create your account')).toBeInTheDocument();

      // Check form fields
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

      // Check terms checkbox
      expect(screen.getByLabelText(/i agree to the/i)).toBeInTheDocument();

      // Check submit button
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();

      // Check links
      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    it('has proper form field types and attributes', () => {
      render(<RegisterPage />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(firstNameInput).toHaveAttribute('type', 'text');
      expect(lastNameInput).toHaveAttribute('type', 'text');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // Check autocomplete
      expect(firstNameInput).toHaveAttribute('autocomplete', 'given-name');
      expect(lastNameInput).toHaveAttribute('autocomplete', 'family-name');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
      expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password');
    });
  });

  describe('Form Validation', () => {
    it('validates required first name', async () => {
      const user = userEvent.setup();
      const { container } = render(<RegisterPage />);

      const form = container.querySelector('form');
      form?.setAttribute('novalidate', 'true');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('validates required last name', async () => {
      const user = userEvent.setup();
      const { container } = render(<RegisterPage />);

      const form = container.querySelector('form');
      form?.setAttribute('novalidate', 'true');

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'John');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('validates required email', async () => {
      const user = userEvent.setup();
      const { container } = render(<RegisterPage />);

      const form = container.querySelector('form');
      form?.setAttribute('novalidate', 'true');

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      const { container } = render(<RegisterPage />);

      const form = container.querySelector('form');
      form?.setAttribute('novalidate', 'true');

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('validates password length', async () => {
      const user = userEvent.setup();
      const { container } = render(<RegisterPage />);

      const form = container.querySelector('form');
      form?.setAttribute('novalidate', 'true');

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'short');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('validates password confirmation', async () => {
      const user = userEvent.setup();
      const { container } = render(<RegisterPage />);

      const form = container.querySelector('form');
      form?.setAttribute('novalidate', 'true');

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'DifferentPassword123!');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('clears validation errors when user types', async () => {
      const user = userEvent.setup();
      const { container } = render(<RegisterPage />);

      const form = container.querySelector('form');
      form?.setAttribute('novalidate', 'true');

      const firstNameInput = screen.getByLabelText(/first name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      // Trigger validation error
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });

      // Start typing
      await user.type(firstNameInput, 'John');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Password Strength Indicator', () => {
    it('shows password strength indicator when typing', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'weak');

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument();
      });
    });

    it('updates password strength for fair password', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      // "Password" has exactly 3 points: length (8), lowercase, uppercase = Fair
      await user.type(passwordInput, 'Password');

      await waitFor(() => {
        expect(screen.getByText(/fair/i)).toBeInTheDocument();
      });
    });

    it('updates password strength for good password', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'Password123');

      await waitFor(() => {
        expect(screen.getByText(/good/i)).toBeInTheDocument();
      });
    });

    it('updates password strength for strong password', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'Password123!');

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });

    it('shows password requirements hint', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'test');

      await waitFor(() => {
        expect(
          screen.getByText(/use 8\+ characters with a mix of letters, numbers & symbols/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { message: 'Registration successful' },
        }),
      } as Response);

      render(<RegisterPage />);

      // Fill in all fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByLabelText(/i agree to the/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/auth/register',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'john@example.com',
              password: 'Password123!',
              firstName: 'John',
              lastName: 'Doe',
            }),
          })
        );
      });

      expect(mockPush).toHaveBeenCalledWith('/login?registered=true');
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: Response) => void;
      const promise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(promise);

      render(<RegisterPage />);

      // Fill in all fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByLabelText(/i agree to the/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Check that inputs are disabled during loading
      expect(screen.getByLabelText(/first name/i)).toBeDisabled();
      expect(screen.getByLabelText(/last name/i)).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ data: { message: 'Success' } }),
      } as Response);

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).not.toBeDisabled();
      });
    });

    it('handles registration failure with general error', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'Email already exists',
        }),
      } as Response);

      render(<RegisterPage />);

      // Fill in all fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByLabelText(/i agree to the/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles registration failure with field-specific errors', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          errors: [
            { field: 'email', message: 'Email is invalid' },
            { field: 'password', message: 'Password is too weak' },
          ],
        }),
      } as Response);

      render(<RegisterPage />);

      // Fill in all fields - use 8+ char password to pass client-side validation
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'invalid@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'weakpass');
      await user.type(screen.getByLabelText(/confirm password/i), 'weakpass');
      await user.click(screen.getByLabelText(/i agree to the/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is invalid/i)).toBeInTheDocument();
        expect(screen.getByText(/password is too weak/i)).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles network errors', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<RegisterPage />);

      // Fill in all fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByLabelText(/i agree to the/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('has link to login page', () => {
      render(<RegisterPage />);

      const loginLink = screen.getByText(/sign in/i).closest('a');
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('has links to terms and privacy pages', () => {
      render(<RegisterPage />);

      const termsLinks = screen.getAllByText(/terms of service/i);
      const privacyLinks = screen.getAllByText(/privacy policy/i);

      expect(termsLinks.length).toBeGreaterThan(0);
      expect(privacyLinks.length).toBeGreaterThan(0);

      const termsLink = termsLinks[0].closest('a');
      const privacyLink = privacyLinks[0].closest('a');

      expect(termsLink).toHaveAttribute('href', '/terms');
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });
  });

  describe('Accessibility', () => {
    it('marks all form inputs as required', () => {
      render(<RegisterPage />);

      expect(screen.getByLabelText(/first name/i)).toBeRequired();
      expect(screen.getByLabelText(/last name/i)).toBeRequired();
      expect(screen.getByLabelText(/email address/i)).toBeRequired();
      expect(screen.getByLabelText(/^password$/i)).toBeRequired();
      expect(screen.getByLabelText(/confirm password/i)).toBeRequired();
      expect(screen.getByLabelText(/i agree to the/i)).toBeRequired();
    });

    it('has proper labels for all inputs', () => {
      render(<RegisterPage />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(firstNameInput).toHaveAttribute('id', 'firstName');
      expect(lastNameInput).toHaveAttribute('id', 'lastName');
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword');
    });
  });
});
