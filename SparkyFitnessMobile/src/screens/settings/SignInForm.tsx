import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useCSSVariable } from 'uniwind';
import {
  login,
  LoginError,
  clearAuthCookies,
  fetchMfaFactors,
  verifyTotp,
  sendEmailOtp,
  verifyEmailOtp,
  suppressSessionExpired,
  type MfaFactors,
} from '../../services/api/authService';
import { saveServerConfig, setActiveServerConfig } from '../../services/storage';
import type { ServerConfig } from '../../services/storage';
import { invalidateServerConnection } from '../../hooks';

type SignInFormProps = {
  config: ServerConfig;
  onSuccess: () => void;
};

const ErrorBanner = ({ message }: { message: string }) =>
  message ? (
    <View className="mb-4 p-3 rounded-lg bg-status-danger-bg">
      <Text className="text-sm text-status-danger-text">{message}</Text>
    </View>
  ) : null;

const PrimaryButton = ({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
}) => {
  const isDisabled = disabled ?? loading;
  return (
    <TouchableOpacity
      className="items-center justify-center py-3.5 rounded-[10px] bg-accent-primary"
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isDisabled}
      style={{ opacity: isDisabled ? 0.7 : 1 }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-white text-[17px] font-semibold">{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const SignInForm: React.FC<SignInFormProps> = ({ config, onSuccess }) => {
  const [textMuted] = useCSSVariable(['--color-text-muted']) as [string];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA state
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [mfaFactors, setMfaFactors] = useState<MfaFactors>({ mfaTotpEnabled: false, mfaEmailEnabled: false });
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'email'>('totp');
  const [mfaCode, setMfaCode] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  const serverUrl = config.url;

  const saveSessionConfig = async (sessionToken: string, userEmail: string) => {
    await saveServerConfig({
      ...config,
      authType: 'session',
      sessionToken,
      email: userEmail,
    });
    await setActiveServerConfig(config.id);
  };

  const handleSignIn = async () => {
    if (!serverUrl) {
      setError('Server configuration not found.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(serverUrl, email.trim(), password);

      if (result.type === 'mfa_required') {
        let factors: MfaFactors = { mfaTotpEnabled: true, mfaEmailEnabled: false };
        try {
          factors = await fetchMfaFactors(serverUrl, email.trim());
        } catch {
          // Fallback: assume TOTP only
        }
        setMfaFactors(factors);
        setMfaMethod(factors.mfaTotpEnabled ? 'totp' : 'email');
        setMfaCode('');
        setEmailOtpSent(false);
        setStep('mfa');
        return;
      }

      await saveSessionConfig(result.sessionToken, result.user.email);
      suppressSessionExpired(false);
      invalidateServerConnection();
      onSuccess();
    } catch (err) {
      if (err instanceof LoginError) {
        setError(err.message);
      } else {
        setError('Could not connect to server. Check the URL and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    const code = mfaCode.trim();
    if (!code) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result =
        mfaMethod === 'totp'
          ? await verifyTotp(serverUrl, code)
          : await verifyEmailOtp(serverUrl, code);

      await saveSessionConfig(result.sessionToken, result.user.email);
      suppressSessionExpired(false);
      invalidateServerConnection();
      onSuccess();
    } catch (err) {
      if (err instanceof LoginError) {
        if (err.statusCode === 429) {
          setError('Too many attempts. Please wait a moment and try again.');
        } else if (err.message.toLowerCase().includes('invalid code')) {
          setError('Invalid verification code. Please try again.');
        } else if (err.statusCode === undefined) {
          setError(err.message);
        } else if (
          err.message.includes('INVALID_TWO_FACTOR_COOKIE') ||
          err.message.toLowerCase().includes('invalid two factor cookie') ||
          err.message.includes('expired')
        ) {
          await clearAuthCookies();
          setError('Your session has expired. Please sign in again.');
          setStep('credentials');
        } else {
          setError(err.message);
        }
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    setLoading(true);
    setError('');

    try {
      await sendEmailOtp(serverUrl);
      setEmailOtpSent(true);
    } catch (err) {
      if (err instanceof LoginError) {
        setError(err.message);
      } else {
        setError('Failed to send email code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = async () => {
    await clearAuthCookies();
    setStep('credentials');
    setMfaCode('');
    setEmailOtpSent(false);
    setError('');
  };

  const handleMfaMethodChange = (method: 'totp' | 'email') => {
    setMfaMethod(method);
    setMfaCode('');
    setError('');
  };

  const showCodeInput = mfaMethod === 'totp' || emailOtpSent;

  if (step === 'credentials') {
    return (
      <>
        <View className="mb-3">
          <Text className="text-sm mb-2 text-text-secondary">Email</Text>
          <View className="border border-border-subtle rounded-lg bg-raised">
            <TextInput
              className="p-2.5 text-base text-text-primary"
              placeholder="email@example.com"
              placeholderTextColor={textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-sm mb-2 text-text-secondary">Password</Text>
          <View className="border border-border-subtle rounded-lg bg-raised">
            <TextInput
              className="p-2.5 text-base text-text-primary"
              placeholder="Password"
              placeholderTextColor={textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>
        </View>

        <ErrorBanner message={error} />
        <PrimaryButton label="Sign In" onPress={handleSignIn} loading={loading} />
      </>
    );
  }

  return (
    <>
      {/* MFA Method Toggle */}
      {mfaFactors.mfaTotpEnabled && mfaFactors.mfaEmailEnabled && (
        <View className="flex-row mb-4 rounded-lg overflow-hidden border border-border-subtle">
          {([
            { method: 'totp' as const, label: 'Authenticator App' },
            { method: 'email' as const, label: 'Email Code' },
          ]).map(({ method, label }) => (
            <TouchableOpacity
              key={method}
              className={`flex-1 py-2.5 items-center ${
                mfaMethod === method ? 'bg-accent-primary' : 'bg-raised'
              }`}
              onPress={() => handleMfaMethodChange(method)}
              activeOpacity={0.8}
            >
              <Text
                className={`text-sm font-semibold ${
                  mfaMethod === method ? 'text-white' : 'text-text-secondary'
                }`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* MFA Instructions */}
      <Text className="text-sm text-text-secondary mb-3 text-center">
        {mfaMethod === 'totp'
          ? 'Enter the code from your authenticator app.'
          : emailOtpSent
            ? 'Enter the code sent to your email.'
            : 'Tap the button below to receive a verification code by email.'}
      </Text>

      {/* Send Email OTP Button */}
      {mfaMethod === 'email' && !emailOtpSent && (
        <View className="mb-3">
          <PrimaryButton label="Send Code" onPress={handleSendEmailOtp} loading={loading} />
        </View>
      )}

      {/* Code Input */}
      {showCodeInput && (
        <>
          <View className="mb-4">
            <View className="border border-border-subtle rounded-lg bg-raised">
              <TextInput
                className="p-2.5 text-base text-text-primary text-center tracking-[8px]"
                placeholder="000000"
                placeholderTextColor={textMuted}
                value={mfaCode}
                onChangeText={(text) => setMfaCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>
          </View>

          <ErrorBanner message={error} />

          <PrimaryButton
            label="Verify"
            onPress={handleVerifyMfa}
            loading={loading}
            disabled={loading || mfaCode.length < 6}
          />
        </>
      )}

      {/* Error (shown when email OTP not yet sent) */}
      {mfaMethod === 'email' && !emailOtpSent && <ErrorBanner message={error} />}

      {/* Resend email code */}
      {mfaMethod === 'email' && emailOtpSent && (
        <TouchableOpacity
          className="items-center py-3 mt-2"
          onPress={handleSendEmailOtp}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text className="text-sm text-accent-primary">Resend Code</Text>
        </TouchableOpacity>
      )}

      {/* Back */}
      <TouchableOpacity
        className="items-center py-3 mt-2"
        onPress={handleBackToCredentials}
        activeOpacity={0.7}
      >
        <Text className="text-base text-text-muted">Back</Text>
      </TouchableOpacity>
    </>
  );
};

export default SignInForm;
