import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { NativeBottomTabScreenProps } from '@bottom-tabs/react-navigation';
import type { RootStackParamList, TabParamList } from '../../types/navigation';
import type { SettingsStackParamList } from '../../types/settingsNavigation';
import {
  getAllServerConfigs,
  proxyHeadersToRecord,
} from '../../services/storage';
import type { ServerConfig } from '../../services/storage';
import {
  logout,
  setPendingProxyHeaders,
  clearPendingProxyHeaders,
  suppressSessionExpired,
} from '../../services/api/authService';
import { queryClient, serverConnectionQueryKey } from '../../hooks';
import SegmentedControl from '../../components/SegmentedControl';
import ScreenHeader from '../../components/ScreenHeader';
import SignInForm from './SignInForm';
import ApiKeyForm from './ApiKeyForm';

type AuthenticationScreenProps = CompositeScreenProps<
  StackScreenProps<SettingsStackParamList, 'Authentication'>,
  CompositeScreenProps<
    NativeBottomTabScreenProps<TabParamList, 'Settings'>,
    StackScreenProps<RootStackParamList>
  >
>;

function getAuthStatusText(config: ServerConfig): string {
  if (config.authType === 'session' && config.sessionToken) {
    return config.email ? `Signed in as ${config.email}` : 'Signed in';
  }
  if (config.authType === 'apiKey' && config.apiKey) {
    return 'API key configured';
  }
  return '';
}

const authSegments = [
  { key: 'session' as const, label: 'Sign In' },
  { key: 'apiKey' as const, label: 'API Key' },
];

const AuthenticationScreen: React.FC<AuthenticationScreenProps> = ({ route, navigation }) => {
  const { configId } = route.params;

  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [authMethod, setAuthMethod] = useState<'session' | 'apiKey'>('session');

  const loadConfig = useCallback(async () => {
    const configs = await getAllServerConfigs();
    const found = configs.find(c => c.id === configId) ?? null;
    setConfig(found);
    if (found?.authType) {
      setAuthMethod(found.authType === 'apiKey' ? 'apiKey' : 'session');
    }
  }, [configId]);

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [loadConfig])
  );

  // Proxy headers lifecycle for sign-in API calls
  useFocusEffect(
    useCallback(() => {
      if (config?.proxyHeaders) {
        setPendingProxyHeaders(proxyHeadersToRecord(config.proxyHeaders));
      }

      return () => {
        clearPendingProxyHeaders();
        suppressSessionExpired(false);
      };
    }, [config])
  );

  const isSessionAuth = config?.authType === 'session' && !!config.sessionToken;

  const handleSignOut = async () => {
    await logout(configId);
    await loadConfig();
    queryClient.invalidateQueries({ queryKey: serverConnectionQueryKey });
  };

  const handleAuthSuccess = () => {
    loadConfig();
  };

  if (!config) return null;

  const authStatus = getAuthStatusText(config);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Authentication" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-4">
          <SegmentedControl
            segments={authSegments}
            activeKey={authMethod}
            onSelect={setAuthMethod}
          />
          {authStatus !== '' && (
            <Text className="text-sm text-text-secondary mt-2 text-center">{authStatus}</Text>
          )}
        </View>

        {isSessionAuth && (
          <TouchableOpacity
            className="items-center justify-center py-3 mb-4 rounded-lg border border-border-subtle bg-surface"
            onPress={handleSignOut}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Text className="text-base text-accent-primary">Sign Out</Text>
          </TouchableOpacity>
        )}

        {authMethod === 'session' ? (
          <SignInForm config={config} onSuccess={handleAuthSuccess} />
        ) : (
          <ApiKeyForm config={config} onSuccess={handleAuthSuccess} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthenticationScreen;
