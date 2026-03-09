import React, { useState, useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllServerConfigs,
  getActiveServerConfig,
} from '../../services/storage';
import type { ServerConfig } from '../../services/storage';
import ServerConfigComponent from '../../components/ServerConfig';
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

  const loadConfig = async (): Promise<void> => {
    const allConfigs = await getAllServerConfigs();
    setServerConfigs(allConfigs);

    const activeConfig = await getActiveServerConfig();
    setActiveConfigId(activeConfig?.id ?? null);
  };

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [])
  );

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-4 pt-2">
        <ServerConfigComponent
          serverConfigs={serverConfigs}
          activeConfigId={activeConfigId}
          onEditServer={(configId) => navigation.navigate('ServerDetail', { configId })}
          onAddServer={() => navigation.navigate('AddServer')}
        />
      </View>
    </ScrollView>
  );
};

export default ServerSettingsScreen;
