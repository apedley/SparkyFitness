import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { ServerConfig } from '../services/storage';
import SegmentedControl from './SegmentedControl';
import SignInForm from '../screens/settings/SignInForm';
import ApiKeyForm from '../screens/settings/ApiKeyForm';

type AuthMethodSelectorProps = {
  config: ServerConfig;
  onSuccess: () => void;
  onSignOut?: () => void;
  statusText?: string;
};

const authSegments = [
  { key: 'session' as const, label: 'Sign In' },
  { key: 'apiKey' as const, label: 'API Key' },
];

const AuthMethodSelector: React.FC<AuthMethodSelectorProps> = ({
  config,
  onSuccess,
  onSignOut,
  statusText,
}) => {
  const [authMethod, setAuthMethod] = useState<'session' | 'apiKey'>(
    config.authType === 'apiKey' ? 'apiKey' : 'session'
  );

  useEffect(() => {
    if (config.authType) {
      setAuthMethod(config.authType === 'apiKey' ? 'apiKey' : 'session');
    }
  }, [config.authType]);

  const isSessionAuth = config.authType === 'session' && !!config.sessionToken;

  return (
    <>
      <View className="mb-4">
        <SegmentedControl
          segments={authSegments}
          activeKey={authMethod}
          onSelect={setAuthMethod}
        />
        {statusText && (
          <Text className="text-sm text-text-secondary mt-2 text-center">{statusText}</Text>
        )}
      </View>

      {onSignOut && isSessionAuth && (
        <TouchableOpacity
          className="items-center justify-center py-3 mb-4 rounded-lg border border-border-subtle bg-surface"
          onPress={onSignOut}
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <Text className="text-base text-accent-primary">Sign Out</Text>
        </TouchableOpacity>
      )}

      {authMethod === 'session' ? (
        <SignInForm config={config} onSuccess={onSuccess} />
      ) : (
        <ApiKeyForm config={config} onSuccess={onSuccess} />
      )}
    </>
  );
};

export default AuthMethodSelector;
