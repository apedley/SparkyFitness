import React, { useState, useCallback } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllServerConfigs,
  getActiveServerConfig,
  setActiveServerConfig,
} from '../../services/storage';
import type { ServerConfig } from '../../services/storage';
import { addLog } from '../../services/LogService';
import { useServerConnection } from '../../hooks';
import ServerConfigComponent from '../../components/ServerConfig';
import LoginModal from '../../components/LoginModal';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { NativeBottomTabScreenProps } from '@bottom-tabs/react-navigation';
import type { RootStackParamList, TabParamList } from '../../types/navigation';
import type { SettingsStackParamList } from '../../types/settingsNavigation';

type ServerSettingsScreenProps = CompositeScreenProps<
  StackScreenProps<SettingsStackParamList, 'ServerSettings'>,
  CompositeScreenProps<
    NativeBottomTabScreenProps<TabParamList, 'Settings'>,
    StackScreenProps<RootStackParamList>
  >
>;

const ServerSettingsScreen: React.FC<ServerSettingsScreenProps> = ({ navigation }) => {
  const [serverConfigs, setServerConfigs] = useState<ServerConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginDefaultConfigId, setLoginDefaultConfigId] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<'add-new' | undefined>(undefined);

  const { refetch: refetchConnection } = useServerConnection();

  const loadConfig = async (): Promise<void> => {
    const allConfigs = await getAllServerConfigs();
    setServerConfigs(allConfigs);

    const activeConfig = await getActiveServerConfig();
    if (activeConfig) {
      setActiveConfigId(activeConfig.id);
    } else if (allConfigs.length > 0) {
      await setActiveServerConfig(allConfigs[0].id);
      setActiveConfigId(allConfigs[0].id);
    } else {
      setActiveConfigId(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [])
  );

  const handleSetActiveConfig = async (configId: string): Promise<void> => {
    if (!__DEV__) {
      const config = serverConfigs.find((c) => c.id === configId);
      if (config?.url.toLowerCase().startsWith('http://')) {
        Alert.alert(
          'Error',
          'HTTPS is required for server connections. Please edit this configuration to use HTTPS.',
        );
        return;
      }
    }
    try {
      await setActiveServerConfig(configId);
      await loadConfig();
      refetchConnection();
      addLog('Active server configuration changed.', 'SUCCESS');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Failed to set active server configuration: ${errorMessage}`, 'ERROR');
      Alert.alert('Error', `Failed to set active server configuration: ${errorMessage}`);
    }
  };

  const handleAddNewConfig = (): void => {
    setLoginDefaultConfigId(null);
    setLoginMode('add-new');
    setShowLoginModal(true);
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-4 pt-2">
        <ServerConfigComponent
          serverConfigs={serverConfigs}
          activeConfigId={activeConfigId}
          onActivateServer={handleSetActiveConfig}
          onEditServer={(configId) => navigation.navigate('ServerEditSettings', { configId })}
          onAddServer={handleAddNewConfig}
        />
      </View>

      <LoginModal
        visible={showLoginModal}
        defaultConfigId={loginDefaultConfigId}
        mode={loginMode}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          loadConfig();
          refetchConnection();
        }}
        onUseApiKey={(serverUrl, loginProxyHeaders, selectedConfigId) => {
          setShowLoginModal(false);
          if (selectedConfigId) {
            navigation.navigate('ServerEditSettings', { configId: selectedConfigId });
          } else {
            const newId = Date.now().toString();
            const normalizedUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
            navigation.navigate('ServerEditSettings', {
              configId: newId,
              prefillUrl: normalizedUrl,
              prefillProxyHeaders: loginProxyHeaders,
            });
          }
        }}
        onDismiss={() => setShowLoginModal(false)}
      />
    </ScrollView>
  );
};

export default ServerSettingsScreen;
