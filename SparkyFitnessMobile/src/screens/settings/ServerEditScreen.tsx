import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
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
  saveServerConfig,
  deleteServerConfig,
} from '../../services/storage';
import type { ServerConfig, ProxyHeader } from '../../services/storage';
import { notifyNoConfigs } from '../../services/api/authService';
import { addLog } from '../../services/LogService';
import { useServerConnection } from '../../hooks';
import Icon from '../../components/Icon';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import LoginModal from '../../components/LoginModal';
import ProxyHeadersModal from '../../components/ProxyHeadersModal';

type ServerEditScreenProps = CompositeScreenProps<
  StackScreenProps<SettingsStackParamList, 'ServerEditSettings'>,
  CompositeScreenProps<
    NativeBottomTabScreenProps<TabParamList, 'Settings'>,
    StackScreenProps<RootStackParamList>
  >
>;

const ServerEditScreen: React.FC<ServerEditScreenProps> = ({ route, navigation }) => {
  const { configId, prefillUrl, prefillProxyHeaders } = route.params;

  const [textMuted, textSecondary, accentPrimary] = useCSSVariable([
    '--color-text-muted',
    '--color-text-secondary',
    '--color-accent-primary',
  ]) as [string, string, string];

  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [proxyHeaders, setProxyHeaders] = useState<ProxyHeader[]>([]);
  const [isActiveConfig, setIsActiveConfig] = useState(false);
  const [showProxyHeaders, setShowProxyHeaders] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { refetch: refetchConnection } = useServerConnection();

  const loadConfig = async () => {
    const allConfigs = await getAllServerConfigs();
    const found = allConfigs.find((c) => c.id === configId) ?? null;
    setConfig(found);

    if (found) {
      setUrl(found.url);
      setApiKey(found.authType === 'session' ? '' : found.apiKey);
      setProxyHeaders(found.proxyHeaders ?? []);
    } else if (prefillUrl !== undefined) {
      setUrl(prefillUrl);
      setProxyHeaders(prefillProxyHeaders ?? []);
    }

    const activeConfig = await getActiveServerConfig();
    setIsActiveConfig(activeConfig?.id === configId);
  };

  useEffect(() => {
    loadConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId]);

  const handleSave = async () => {
    if (!url) {
      Alert.alert('Error', 'Please enter a server URL.');
      return;
    }
    if (!__DEV__ && url.toLowerCase().startsWith('http://')) {
      Alert.alert('Error', 'HTTPS is required for server connections.');
      return;
    }

    try {
      const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const hasNewApiKey = !!apiKey.trim();
      const configToSave: ServerConfig = {
        id: configId,
        url: normalizedUrl,
        apiKey: apiKey || config?.apiKey || '',
        ...(hasNewApiKey ? { authType: 'apiKey' as const, sessionToken: '' } : {}),
        proxyHeaders,
      };
      await saveServerConfig(configToSave);
      refetchConnection();
      addLog('Server configuration saved.', 'SUCCESS');
      navigation.goBack();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Failed to save server configuration: ${errorMessage}`, 'ERROR');
      Alert.alert('Error', `Failed to save settings: ${errorMessage}`);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Server',
      `Are you sure you want to delete "${url || configId}"?`,
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
              navigation.goBack();
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              addLog(`Failed to delete server configuration: ${errorMessage}`, 'ERROR');
              Alert.alert('Error', `Failed to delete server: ${errorMessage}`);
            }
          },
        },
      ],
    );
  };

  const handleOpenWebDashboard = async () => {
    const serverUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    if (!serverUrl) {
      Alert.alert('No URL', 'Please save a server URL first.');
      return;
    }
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} style={{ marginRight: 16 }}>
          <Text style={{ color: accentPrimary, fontSize: 17 }}>Save</Text>
        </TouchableOpacity>
      ),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, url, apiKey, proxyHeaders, accentPrimary, config]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Server URL field */}
        <SettingsGroup title="Server URL">
          <View className="px-4 py-3">
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 text-base text-text-primary"
                placeholder="https://your-server-url.com"
                placeholderTextColor={textMuted}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                className="p-1 ml-2"
                onPress={async () => setUrl(await Clipboard.getString())}
                accessibilityLabel="Paste URL from clipboard"
                accessibilityRole="button"
              >
                <Icon name="paste" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </SettingsGroup>

        {/* API Key field */}
        <SettingsGroup title="API Key">
          <View className="px-4 py-3">
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 text-base text-text-primary"
                placeholder={config?.authType === 'session' ? 'Session auth active' : 'Uds3d8i...'}
                placeholderTextColor={textMuted}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
              />
              <TouchableOpacity
                className="p-1 ml-2"
                onPress={async () => setApiKey(await Clipboard.getString())}
                accessibilityLabel="Paste API key from clipboard"
                accessibilityRole="button"
              >
                <Icon name="paste" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </SettingsGroup>

        {/* Actions group */}
        <SettingsGroup>
          <SettingsRow
            label={`Proxy Headers${proxyHeaders.length > 0 ? ` (${proxyHeaders.length})` : ''}`}
            onPress={() => setShowProxyHeaders(true)}
          />
          <SettingsRow
            label="Sign In"
            onPress={() => setShowLoginModal(true)}
          />
          {isActiveConfig && (
            <SettingsRow
              label="Open Web Dashboard"
              onPress={handleOpenWebDashboard}
            />
          )}
        </SettingsGroup>

        {/* Delete button */}
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
      </ScrollView>

      <ProxyHeadersModal
        visible={showProxyHeaders}
        onClose={() => setShowProxyHeaders(false)}
        headers={proxyHeaders}
        onSave={setProxyHeaders}
      />

      <LoginModal
        visible={showLoginModal}
        defaultConfigId={configId}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          loadConfig();
          refetchConnection();
        }}
        onUseApiKey={(_serverUrl, _loginProxyHeaders, _selectedConfigId) => {
          setShowLoginModal(false);
        }}
        onDismiss={() => setShowLoginModal(false)}
      />
    </KeyboardAvoidingView>
  );
};

export default ServerEditScreen;
