/**
 * 2FA Verification Page Tests
 *
 * Comprehensive tests for the 2FA verification page component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import Verify2FAPage from '../page';

// Mock fetch
global.fetch = jest.fn();

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('Verify2FAPage', () => {
  let mockPush: jest.Mock;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the 2FA verification page with all elements', () => {
      render(<Verify2FAPage />);

      // Check header
      expect(screen.getByText('FreeTimeChat')).toBeInTheDocument();
      expect(screen.getByText('Two-factor authentication')).toBeInTheDocument();
      expect(screen.getByText(/enter the code from your authenticator app/i)).toBeInTheDocument();

      // Check form elements
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();

      // Check toggle button
      expect(screen.getByText(/use backup code instead/i)).toBeInTheDocument();

      // Check links
      expect(screen.getByText(/back to login/i)).toBeInTheDocument();
      expect(screen.getByText(/contact support/i)).toBeInTheDocument();
    });

    it('has proper input attributes for verification code', () => {
      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);

      expect(codeInput).toHaveAttribute('type', 'text');
      expect(codeInput).toHaveAttribute('inputmode', 'numeric');
      expect(codeInput).toHaveAttribute('pattern', '[0-9]*');
      expect(codeInput).toHaveAttribute('maxlength', '6');
      expect(codeInput).toBeRequired();
    });
  });

  describe('Verification Code Mode', () => {
    it('validates 6-digit code format', async () => {
      const user = userEvent.setup();
      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a 6-digit code/i)).toBeInTheDocument();
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('allows only numeric input in verification code', async () => {
      const user = userEvent.setup();
      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123abc456');

      expect(codeInput).toHaveValue('123456');
    });

    it('limits verification code to 6 digits', async () => {
      const user = userEvent.setup();
      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '12345678');

      expect(codeInput).toHaveValue('123456');
    });

    it('submits valid 6-digit code', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { message: 'Verified' } }),
      } as Response);

      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/2fa/verify',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ code: '123456' }),
          })
        );
      });

      expect(mockPush).toHaveBeenCalledWith('/chat');
    });

    it('shows error for invalid verification code', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid code' }),
      } as Response);

      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Backup Code Mode', () => {
    it('toggles to backup code mode', async () => {
      const user = userEvent.setup();
      render(<Verify2FAPage />);

      const toggleButton = screen.getByText(/use backup code instead/i);
      await user.click(toggleButton);

      // Check label changed
      expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/verification code/i)).not.toBeInTheDocument();

      // Check toggle button text changed
      expect(screen.getByText(/use authenticator code instead/i)).toBeInTheDocument();
      expect(screen.queryByText(/use backup code instead/i)).not.toBeInTheDocument();
    });

    it('has proper input attributes for backup code', async () => {
      const user = userEvent.setup();
      render(<Verify2FAPage />);

      const toggleButton = screen.getByText(/use backup code instead/i);
      await user.click(toggleButton);

      const codeInput = screen.getByLabelText(/backup code/i);

      expect(codeInput).toHaveAttribute('type', 'text');
      expect(codeInput).toHaveAttribute('inputmode', 'text');
      expect(codeInput).not.toHaveAttribute('pattern');
      expect(codeInput).toHaveAttribute('maxlength', '32');
      expect(codeInput).toBeRequired();
    });

    it('allows alphanumeric input in backup code mode', async () => {
      const user = userEvent.setup();
      render(<Verify2FAPage />);

      const toggleButton = screen.getByText(/use backup code instead/i);
      await user.click(toggleButton);

      const codeInput = screen.getByLabelText(/backup code/i);
      await user.type(codeInput, 'ABC123xyz789');

      expect(codeInput).toHaveValue('ABC123xyz789');
    });

    it('validates backup code is not empty', async () => {
      const user = userEvent.setup();
      const { container } = render(<Verify2FAPage />);

      const form = container.querySelector('form');
      form?.setAttribute('novalidate', 'true');

      const toggleButton = screen.getByText(/use backup code instead/i);
      await user.click(toggleButton);

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a backup code/i)).toBeInTheDocument();
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('submits valid backup code', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { message: 'Verified' } }),
      } as Response);

      render(<Verify2FAPage />);

      const toggleButton = screen.getByText(/use backup code instead/i);
      await user.click(toggleButton);

      const codeInput = screen.getByLabelText(/backup code/i);
      await user.type(codeInput, 'BACKUP-CODE-123');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/2fa/verify-backup',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ code: 'BACKUP-CODE-123' }),
          })
        );
      });

      expect(mockPush).toHaveBeenCalledWith('/chat');
    });

    it('clears code and error when toggling modes', async () => {
      const user = userEvent.setup();
      render(<Verify2FAPage />);

      // Enter code and trigger error
      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a 6-digit code/i)).toBeInTheDocument();
      });

      // Toggle to backup code
      const toggleButton = screen.getByText(/use backup code instead/i);
      await user.click(toggleButton);

      // Error should be cleared
      expect(screen.queryByText(/please enter a 6-digit code/i)).not.toBeInTheDocument();

      // Input should be empty
      const backupCodeInput = screen.getByLabelText(/backup code/i);
      expect(backupCodeInput).toHaveValue('');
    });
  });

  describe('Session Storage', () => {
    it('clears temp 2FA token after successful verification', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { message: 'Verified' } }),
      } as Response);

      sessionStorage.setItem('temp2FAToken', 'test-token');

      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(sessionStorage.getItem('temp2FAToken')).toBeNull();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state during verification', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: Response) => void;
      const promise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(promise);

      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      // Check that input is disabled during loading
      expect(codeInput).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ data: { message: 'Verified' } }),
      } as Response);

      await waitFor(() => {
        expect(codeInput).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('shows default error message when API returns no message', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid code\. please try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('has link to login page', () => {
      render(<Verify2FAPage />);

      const loginLink = screen.getByText(/back to login/i).closest('a');
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('has link to support page', () => {
      render(<Verify2FAPage />);

      const supportLink = screen.getByText(/contact support/i).closest('a');
      expect(supportLink).toHaveAttribute('href', '/support');
    });
  });

  describe('Accessibility', () => {
    it('marks input as required', () => {
      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      expect(codeInput).toBeRequired();
    });

    it('has proper label for input', () => {
      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      expect(codeInput).toHaveAttribute('id', 'verificationCode');
    });

    it('displays error with proper role', async () => {
      const user = userEvent.setup();
      render(<Verify2FAPage />);

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        const errorElement = screen.getByText(/please enter a 6-digit code/i);
        expect(errorElement).toBeInTheDocument();
      });
    });
  });
});
