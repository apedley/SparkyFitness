import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SignInScreen from '../../../src/screens/settings/SignInScreen';
import {
  login,
  LoginError,
  clearAuthCookies,
  fetchMfaFactors,
  verifyTotp,
  sendEmailOtp,
  verifyEmailOtp,
} from '../../../src/services/api/authService';
import {
  getAllServerConfigs,
  saveServerConfig,
  type ServerConfig,
} from '../../../src/services/storage';

jest.mock('../../../src/services/api/authService', () => ({
  login: jest.fn(),
  LoginError: jest.requireActual('../../../src/services/api/authService').LoginError,
  clearAuthCookies: jest.fn().mockResolvedValue(undefined),
  fetchMfaFactors: jest.fn(),
  verifyTotp: jest.fn(),
  sendEmailOtp: jest.fn(),
  verifyEmailOtp: jest.fn(),
  setPendingProxyHeaders: jest.fn(),
  clearPendingProxyHeaders: jest.fn(),
  suppressSessionExpired: jest.fn(),
}));

jest.mock('../../../src/services/storage', () => ({
  getAllServerConfigs: jest.fn(),
  saveServerConfig: jest.fn().mockResolvedValue(undefined),
  proxyHeadersToRecord: jest.requireActual('../../../src/services/storage').proxyHeadersToRecord,
}));

jest.mock('../../../src/hooks', () => ({
  queryClient: { invalidateQueries: jest.fn() },
  serverConnectionQueryKey: ['serverConnection'],
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (cb: () => (() => void) | void) => {
      // Run the callback immediately so proxy headers logic executes
      const { useEffect } = require('react');
      useEffect(() => {
        return cb();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

jest.mock('../../../src/components/Icon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID={`icon-${props.name}`} />,
  };
});

jest.mock('../../../src/components/settings/SettingsGroup', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, title }: any) => (
      <View testID={`settings-group-${title ?? 'untitled'}`}>{children}</View>
    ),
  };
});

jest.mock('../../../src/components/settings/SettingsRow', () => {
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ label }: any) => (
      <View testID="settings-row">
        <Text>{label}</Text>
      </View>
    ),
  };
});

const mockLogin = login as jest.MockedFunction<typeof login>;
const mockClearAuthCookies = clearAuthCookies as jest.MockedFunction<typeof clearAuthCookies>;
const mockFetchMfaFactors = fetchMfaFactors as jest.MockedFunction<typeof fetchMfaFactors>;
const mockVerifyTotp = verifyTotp as jest.MockedFunction<typeof verifyTotp>;
const mockSendEmailOtp = sendEmailOtp as jest.MockedFunction<typeof sendEmailOtp>;
const mockVerifyEmailOtp = verifyEmailOtp as jest.MockedFunction<typeof verifyEmailOtp>;
const mockGetAllServerConfigs = getAllServerConfigs as jest.MockedFunction<typeof getAllServerConfigs>;
const mockSaveServerConfig = saveServerConfig as jest.MockedFunction<typeof saveServerConfig>;

const testConfig: ServerConfig = {
  id: 'cfg-1',
  url: 'https://test-server.com',
  apiKey: 'key-1',
  authType: 'session' as const,
  sessionToken: 'old-token',
};

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn().mockReturnValue(jest.fn()),
} as any;

const mockRoute = {
  params: { configId: 'cfg-1' },
  key: 'SignInSettings-1',
  name: 'SignInSettings' as const,
};

function renderScreen(overrides: Partial<{ route: typeof mockRoute; navigation: typeof mockNavigation }> = {}) {
  return render(
    <SignInScreen
      navigation={overrides.navigation ?? mockNavigation}
      route={overrides.route ?? mockRoute}
    />,
  );
}

function pressSignInButton(result: ReturnType<typeof renderScreen>) {
  const buttons = result.getAllByText('Sign In');
  fireEvent.press(buttons[buttons.length - 1]);
}

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllServerConfigs.mockResolvedValue([testConfig]);
    mockClearAuthCookies.mockResolvedValue(undefined);
    mockSaveServerConfig.mockResolvedValue(undefined);
  });

  describe('credentials form', () => {
    it('renders the sign-in form with server URL display', async () => {
      const result = renderScreen();

      await waitFor(() =>
        expect(result.getByText('https://test-server.com')).toBeTruthy(),
      );
      expect(result.getByPlaceholderText('email@example.com')).toBeTruthy();
      expect(result.getByPlaceholderText('Password')).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('shows error when email is empty', async () => {
      const result = renderScreen();
      await waitFor(() => expect(result.getByPlaceholderText('email@example.com')).toBeTruthy());

      await act(async () => {
        pressSignInButton(result);
      });

      expect(result.getByText('Please enter your email.')).toBeTruthy();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('shows error when password is empty', async () => {
      const result = renderScreen();
      await waitFor(() => expect(result.getByPlaceholderText('email@example.com')).toBeTruthy());

      fireEvent.changeText(result.getByPlaceholderText('email@example.com'), 'user@example.com');

      await act(async () => {
        pressSignInButton(result);
      });

      expect(result.getByText('Please enter your password.')).toBeTruthy();
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('successful login', () => {
    it('calls login, saves config with email, and goes back', async () => {
      mockLogin.mockResolvedValue({
        type: 'success',
        sessionToken: 'new-session-token',
        user: { email: 'user@example.com' },
      });

      const result = renderScreen();
      await waitFor(() => expect(result.getByPlaceholderText('email@example.com')).toBeTruthy());

      fireEvent.changeText(result.getByPlaceholderText('email@example.com'), 'user@example.com');
      fireEvent.changeText(result.getByPlaceholderText('Password'), 'password123');

      await act(async () => {
        pressSignInButton(result);
      });

      expect(mockLogin).toHaveBeenCalledWith(
        'https://test-server.com',
        'user@example.com',
        'password123',
      );
      expect(mockSaveServerConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cfg-1',
          url: 'https://test-server.com',
          authType: 'session',
          sessionToken: 'new-session-token',
          email: 'user@example.com',
        }),
      );
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('login errors', () => {
    it('displays LoginError message', async () => {
      mockLogin.mockRejectedValue(new LoginError('Invalid credentials', 401));

      const result = renderScreen();
      await waitFor(() => expect(result.getByPlaceholderText('email@example.com')).toBeTruthy());

      fireEvent.changeText(result.getByPlaceholderText('email@example.com'), 'a@b.com');
      fireEvent.changeText(result.getByPlaceholderText('Password'), 'wrong');

      await act(async () => {
        pressSignInButton(result);
      });

      expect(result.getByText('Invalid credentials')).toBeTruthy();
    });

    it('displays generic error for non-LoginError exceptions', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'));

      const result = renderScreen();
      await waitFor(() => expect(result.getByPlaceholderText('email@example.com')).toBeTruthy());

      fireEvent.changeText(result.getByPlaceholderText('email@example.com'), 'a@b.com');
      fireEvent.changeText(result.getByPlaceholderText('Password'), 'pass');

      await act(async () => {
        pressSignInButton(result);
      });

      expect(
        result.getByText('Could not connect to server. Check the URL and try again.'),
      ).toBeTruthy();
    });
  });

  describe('MFA flow', () => {
    async function navigateToMfa(
      result: ReturnType<typeof renderScreen>,
      factors = { mfaTotpEnabled: true, mfaEmailEnabled: false },
    ) {
      mockLogin.mockResolvedValue({ type: 'mfa_required' });
      mockFetchMfaFactors.mockResolvedValue(factors);

      await waitFor(() => expect(result.getByPlaceholderText('email@example.com')).toBeTruthy());

      fireEvent.changeText(result.getByPlaceholderText('email@example.com'), 'user@test.com');
      fireEvent.changeText(result.getByPlaceholderText('Password'), 'pass');

      await act(async () => {
        pressSignInButton(result);
      });
    }

    it('transitions to MFA form when login returns mfa_required', async () => {
      const result = renderScreen();
      await navigateToMfa(result);

      expect(
        result.getByText('Enter the code from your authenticator app.'),
      ).toBeTruthy();
    });

    it('verifies TOTP code and completes login', async () => {
      mockVerifyTotp.mockResolvedValue({
        sessionToken: 'mfa-token',
        user: { email: 'user@test.com' },
      });

      const result = renderScreen();
      await navigateToMfa(result);

      fireEvent.changeText(result.getByPlaceholderText('000000'), '123456');

      await act(async () => {
        fireEvent.press(result.getByText('Verify'));
      });

      expect(mockVerifyTotp).toHaveBeenCalledWith('https://test-server.com', '123456');
      expect(mockSaveServerConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          authType: 'session',
          sessionToken: 'mfa-token',
          email: 'user@test.com',
        }),
      );
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('shows method toggle when both TOTP and email are enabled', async () => {
      const result = renderScreen();
      await navigateToMfa(result, {
        mfaTotpEnabled: true,
        mfaEmailEnabled: true,
      });

      expect(result.getByText('Authenticator App')).toBeTruthy();
      expect(result.getByText('Email Code')).toBeTruthy();
    });

    it('handles email OTP flow: send code then verify', async () => {
      mockSendEmailOtp.mockResolvedValue(undefined);
      mockVerifyEmailOtp.mockResolvedValue({
        sessionToken: 'email-mfa-token',
        user: { email: 'user@test.com' },
      });

      const result = renderScreen();
      await navigateToMfa(result, {
        mfaTotpEnabled: true,
        mfaEmailEnabled: true,
      });

      // Switch to email method
      await act(async () => {
        fireEvent.press(result.getByText('Email Code'));
      });

      expect(
        result.getByText(
          'Tap the button below to receive a verification code by email.',
        ),
      ).toBeTruthy();

      // Send code
      await act(async () => {
        fireEvent.press(result.getByText('Send Code'));
      });

      expect(mockSendEmailOtp).toHaveBeenCalled();
      expect(result.getByText('Enter the code sent to your email.')).toBeTruthy();
      expect(result.getByText('Resend Code')).toBeTruthy();

      // Enter and verify code
      fireEvent.changeText(result.getByPlaceholderText('000000'), '654321');

      await act(async () => {
        fireEvent.press(result.getByText('Verify'));
      });

      expect(mockVerifyEmailOtp).toHaveBeenCalledWith(
        'https://test-server.com',
        '654321',
      );
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('navigates back to credentials from MFA and clears cookies', async () => {
      const result = renderScreen();
      await navigateToMfa(result);

      expect(
        result.getByText('Enter the code from your authenticator app.'),
      ).toBeTruthy();

      await act(async () => {
        fireEvent.press(result.getByText('Back'));
      });

      expect(mockClearAuthCookies).toHaveBeenCalled();
      expect(result.getAllByText('Sign In').length).toBeGreaterThan(0);
    });
  });

  describe('MFA error handling', () => {
    async function setupMfaForm(result: ReturnType<typeof renderScreen>) {
      mockLogin.mockResolvedValue({ type: 'mfa_required' });
      mockFetchMfaFactors.mockResolvedValue({
        mfaTotpEnabled: true,
        mfaEmailEnabled: false,
      });

      await waitFor(() => expect(result.getByPlaceholderText('email@example.com')).toBeTruthy());

      fireEvent.changeText(result.getByPlaceholderText('email@example.com'), 'a@b.com');
      fireEvent.changeText(result.getByPlaceholderText('Password'), 'pass');

      await act(async () => {
        pressSignInButton(result);
      });
    }

    it('shows invalid code error', async () => {
      mockVerifyTotp.mockRejectedValue(
        new LoginError('invalid code', 400),
      );

      const result = renderScreen();
      await setupMfaForm(result);

      fireEvent.changeText(result.getByPlaceholderText('000000'), '000000');

      await act(async () => {
        fireEvent.press(result.getByText('Verify'));
      });

      expect(
        result.getByText('Invalid verification code. Please try again.'),
      ).toBeTruthy();
    });

    it('shows rate limit error on 429', async () => {
      mockVerifyTotp.mockRejectedValue(new LoginError('Too many', 429));

      const result = renderScreen();
      await setupMfaForm(result);

      fireEvent.changeText(result.getByPlaceholderText('000000'), '111111');

      await act(async () => {
        fireEvent.press(result.getByText('Verify'));
      });

      expect(
        result.getByText('Too many attempts. Please wait a moment and try again.'),
      ).toBeTruthy();
    });

    it('returns to credentials on expired session', async () => {
      mockVerifyTotp.mockRejectedValue(
        new LoginError('INVALID_TWO_FACTOR_COOKIE', 401),
      );

      const result = renderScreen();
      await setupMfaForm(result);

      fireEvent.changeText(result.getByPlaceholderText('000000'), '222222');

      await act(async () => {
        fireEvent.press(result.getByText('Verify'));
      });

      // Should navigate back to credentials form
      await waitFor(() => {
        expect(result.getByPlaceholderText('email@example.com')).toBeTruthy();
      });
    });

    it('shows generic error for non-LoginError MFA failures', async () => {
      mockVerifyTotp.mockRejectedValue(new Error('Network error'));

      const result = renderScreen();
      await setupMfaForm(result);

      fireEvent.changeText(result.getByPlaceholderText('000000'), '333333');

      await act(async () => {
        fireEvent.press(result.getByText('Verify'));
      });

      expect(
        result.getByText('Verification failed. Please try again.'),
      ).toBeTruthy();
    });

    it('shows error when send email OTP fails', async () => {
      mockLogin.mockResolvedValue({ type: 'mfa_required' });
      mockFetchMfaFactors.mockResolvedValue({
        mfaTotpEnabled: false,
        mfaEmailEnabled: true,
      });
      mockSendEmailOtp.mockRejectedValue(
        new LoginError('Email send failed', 500),
      );

      const result = renderScreen();
      await waitFor(() => expect(result.getByPlaceholderText('email@example.com')).toBeTruthy());

      fireEvent.changeText(result.getByPlaceholderText('email@example.com'), 'a@b.com');
      fireEvent.changeText(result.getByPlaceholderText('Password'), 'pass');

      await act(async () => {
        pressSignInButton(result);
      });

      // Should default to email since totp is disabled
      await act(async () => {
        fireEvent.press(result.getByText('Send Code'));
      });

      expect(result.getByText('Email send failed')).toBeTruthy();
    });
  });

  describe('fetchMfaFactors fallback', () => {
    it('defaults to TOTP when fetchMfaFactors fails', async () => {
      mockLogin.mockResolvedValue({ type: 'mfa_required' });
      mockFetchMfaFactors.mockRejectedValue(new Error('Failed'));

      const result = renderScreen();
      await waitFor(() => expect(result.getByPlaceholderText('email@example.com')).toBeTruthy());

      fireEvent.changeText(result.getByPlaceholderText('email@example.com'), 'a@b.com');
      fireEvent.changeText(result.getByPlaceholderText('Password'), 'pass');

      await act(async () => {
        pressSignInButton(result);
      });

      // Should show TOTP instructions (fallback)
      expect(
        result.getByText('Enter the code from your authenticator app.'),
      ).toBeTruthy();
    });
  });
});
