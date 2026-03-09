import React, { useState, useCallback } from 'react';
import {
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCSSVariable } from 'uniwind';
import * as WebBrowser from 'expo-web-browser';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { NativeBottomTabScreenProps } from '@bottom-tabs/react-navigation';
import type { RootStackParamList, TabParamList } from '../../types/navigation';
import type { SettingsStackParamList } from '../../types/settingsNavigation';
import {
  getAllServerConfigs,
  getActiveServerConfig,
  setActiveServerConfig,
  deleteServerConfig,
} from '../../services/storage';
import type { ServerConfig } from '../../services/storage';
import { notifyNoConfigs } from '../../services/api/authService';
import { addLog } from '../../services/LogService';
import { useServerConnection } from '../../hooks';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import ProxyHeadersModal from '../../components/ProxyHeadersModal';
import ScreenHeader from '../../components/ScreenHeader';

type ServerDetailScreenProps = CompositeScreenProps<
  StackScreenProps<SettingsStackParamList, 'ServerDetail'>,
  CompositeScreenProps<
    NativeBottomTabScreenProps<TabParamList, 'Settings'>,
    StackScreenProps<RootStackParamList>
  >
>;

function getAuthStatusText(config: ServerConfig): string {
  if (config.authType === 'session' && config.sessionToken) {
    return 'Signed in';
  }
  if (config.authType === 'apiKey' && config.apiKey) {
    return 'API key configured';
  }
  return 'Not configured';
}

const ServerDetailScreen: React.FC<ServerDetailScreenProps> = ({ route, navigation }) => {
  const { configId } = route.params;

  const [accentPrimary] = useCSSVariable(['--color-accent-primary']) as [string];

  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [showProxyHeaders, setShowProxyHeaders] = useState(false);

  const { refetch: refetchConnection } = useServerConnection();

  const loadConfig = useCallback(async () => {
    const configs = await getAllServerConfigs();
    const found = configs.find(c => c.id === configId) ?? null;
    setConfig(found);

    const active = await getActiveServerConfig();
    setIsActive(active?.id === configId);
  }, [configId]);

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [loadConfig])
  );

  const handleToggleActive = async (value: boolean) => {
    if (!value || !config) return;

    if (!__DEV__ && config.url.toLowerCase().startsWith('http://')) {
      Alert.alert('Error', 'HTTPS is required for server connections.');
      return;
    }

    try {
      await setActiveServerConfig(configId);
      setIsActive(true);
      refetchConnection();
      addLog('Active server configuration changed.', 'SUCCESS');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Failed to set active server: ${errorMessage}`);
    }
  };

  const handleOpenWebDashboard = async () => {
    const serverUrl = config?.url.replace(/\/+$/, '');
    if (!serverUrl) return;
    try {
      await WebBrowser.openBrowserAsync(serverUrl);
    } catch {
      try {
        await Linking.openURL(serverUrl);
      } catch (linkError) {
        const errorMessage = linkError instanceof Error ? linkError.message : String(linkError);
        Alert.alert('Error', `Could not open web dashboard: ${errorMessage}`);
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Server',
      `Are you sure you want to delete "${config?.url ?? configId}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteServerConfig(configId);
              refetchConnection();
              addLog('Server configuration deleted.', 'SUCCESS');
              const remaining = await getAllServerConfigs();
              if (remaining.length === 0) {
                notifyNoConfigs();
              }
              navigation.popTo('ServerSettings');
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              Alert.alert('Error', `Failed to delete server: ${errorMessage}`);
            }
          },
        },
      ],
    );
  };

  const handleProxyHeadersSave = async (headers: import('../../services/storage').ProxyHeader[]) => {
    if (!config) return;
    const { saveServerConfig: save } = await import('../../services/storage');
    await save({ ...config, proxyHeaders: headers });
    await loadConfig();
  };

  if (!config) return null;

  const authStatus = getAuthStatusText(config);

  return (
    <>
      <ScreenHeader title="Server" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100 }}
      >
        <SettingsGroup title="Server URL">
          <SettingsRow label={config.url} />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            label="Authentication"
            subtitle={authStatus}
            onPress={() => navigation.navigate('Authentication', { configId })}
          />
        </SettingsGroup>

        <SettingsGroup title="Connection">
          <SettingsRow
            label="Use This Server"
            trailing={
              <Switch
                value={isActive}
                onValueChange={handleToggleActive}
                trackColor={{ true: accentPrimary }}
              />
            }
          />
          <SettingsRow
            label="Open Web Dashboard"
            onPress={handleOpenWebDashboard}
          />
        </SettingsGroup>

        <SettingsGroup title="Advanced">
          <SettingsRow
            label={`Proxy Headers${config.proxyHeaders?.length ? ` (${config.proxyHeaders.length})` : ''}`}
            onPress={() => setShowProxyHeaders(true)}
          />
        </SettingsGroup>

        <SettingsGroup>
          <TouchableOpacity
            className="flex-row items-center justify-center px-4 py-3"
            onPress={handleDelete}
            accessibilityLabel="Delete server"
            accessibilityRole="button"
          >
            <Text className="text-base text-accent-primary">Delete Server</Text>
          </TouchableOpacity>
        </SettingsGroup>

        <ProxyHeadersModal
          visible={showProxyHeaders}
          onClose={() => setShowProxyHeaders(false)}
          headers={config.proxyHeaders ?? []}
          onSave={handleProxyHeadersSave}
        />
      </ScrollView>
    </>
  );
};

export default ServerDetailScreen;
