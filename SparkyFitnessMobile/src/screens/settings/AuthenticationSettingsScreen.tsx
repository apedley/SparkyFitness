import React, { useState, useCallback } from 'react';
import { Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { NativeBottomTabScreenProps } from '@bottom-tabs/react-navigation';
import type { RootStackParamList, TabParamList } from '../../types/navigation';
import type { SettingsStackParamList } from '../../types/settingsNavigation';
import { getAllServerConfigs } from '../../services/storage';
import type { ServerConfig } from '../../services/storage';
import { logout } from '../../services/api/authService';
import { queryClient, serverConnectionQueryKey } from '../../hooks';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';

type AuthenticationSettingsScreenProps = CompositeScreenProps<
  StackScreenProps<SettingsStackParamList, 'AuthenticationSettings'>,
  CompositeScreenProps<
    NativeBottomTabScreenProps<TabParamList, 'Settings'>,
    StackScreenProps<RootStackParamList>
  >
>;

function getAuthStatus(config: ServerConfig | null): string {
  if (!config) return 'Not configured';
  if (config.authType === 'session' && config.sessionToken) {
    return config.email ? `Signed in as ${config.email}` : 'Signed in';
  }
  if (config.authType === 'apiKey' && config.apiKey) {
    return 'API key configured';
  }
  return 'Not configured';
}

const AuthenticationSettingsScreen: React.FC<AuthenticationSettingsScreenProps> = ({ route, navigation }) => {
  const { configId } = route.params;
  const [config, setConfig] = useState<ServerConfig | null>(null);

  const loadConfig = useCallback(async () => {
    const configs = await getAllServerConfigs();
    setConfig(configs.find(c => c.id === configId) ?? null);
  }, [configId]);

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [loadConfig])
  );

  const isSessionAuth = config?.authType === 'session' && !!config.sessionToken;
  const authStatus = getAuthStatus(config);

  const handleSignOut = async () => {
    await logout(configId);
    await loadConfig();
    queryClient.invalidateQueries({ queryKey: serverConnectionQueryKey });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 40 }}
    >
      <SettingsGroup title="Current Status">
        <SettingsRow label={authStatus} />
      </SettingsGroup>

      <SettingsGroup title="Methods">
        <SettingsRow
          label="Sign In"
          onPress={() => navigation.navigate('SignInSettings', { configId })}
        />
        <SettingsRow
          label="Use API Key"
          onPress={() => navigation.navigate('ApiKeySettings', { configId })}
        />
      </SettingsGroup>

      {isSessionAuth && (
        <SettingsGroup>
          <TouchableOpacity
            className="flex-row items-center justify-center px-4 py-3"
            onPress={handleSignOut}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Text className="text-base text-accent-primary">Sign Out</Text>
          </TouchableOpacity>
        </SettingsGroup>
      )}
    </ScrollView>
  );
};

export default AuthenticationSettingsScreen;
