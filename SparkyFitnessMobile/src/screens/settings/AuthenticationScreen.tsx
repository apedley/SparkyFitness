import React, { useCallback } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { NativeBottomTabScreenProps } from '@bottom-tabs/react-navigation';
import type { RootStackParamList, TabParamList } from '../../types/navigation';
import type { SettingsStackParamList } from '../../types/settingsNavigation';
import { logout, suppressSessionExpired } from '../../services/api/authService';
import { invalidateServerConnection, useProxyHeadersLifecycle } from '../../hooks';
import { useServerConfig } from '../../hooks/useServerConfig';
import { getAuthStatusText } from '../../utils/authUtils';
import ScreenHeader from '../../components/ScreenHeader';
import AuthMethodSelector from '../../components/AuthMethodSelector';

type AuthenticationScreenProps = CompositeScreenProps<
  StackScreenProps<SettingsStackParamList, 'Authentication'>,
  CompositeScreenProps<
    NativeBottomTabScreenProps<TabParamList, 'Settings'>,
    StackScreenProps<RootStackParamList>
  >
>;

const AuthenticationScreen: React.FC<AuthenticationScreenProps> = ({ route, navigation }) => {
  const { configId } = route.params;

  const { config, reload } = useServerConfig(configId);

  useProxyHeadersLifecycle(config?.proxyHeaders);

  // Reset session expiration suppression when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => suppressSessionExpired(false);
    }, [])
  );

  const handleSignOut = async () => {
    await logout(configId);
    await reload();
    invalidateServerConnection();
  };

  const handleAuthSuccess = () => {
    reload();
  };

  if (!config) return null;

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
        <AuthMethodSelector
          config={config}
          onSuccess={handleAuthSuccess}
          onSignOut={handleSignOut}
          statusText={getAuthStatusText(config)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthenticationScreen;
