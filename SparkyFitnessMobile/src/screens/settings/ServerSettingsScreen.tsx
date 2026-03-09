import React from 'react';
import { ScrollView, View } from 'react-native';
import ServerConfigComponent from '../../components/ServerConfig';
import ScreenHeader from '../../components/ScreenHeader';
import { useServerConfigs } from '../../hooks/useServerConfig';
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
  const { configs, activeConfigId } = useServerConfigs();

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Server" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="p-4 pt-2">
          <ServerConfigComponent
            serverConfigs={configs}
            activeConfigId={activeConfigId}
            onEditServer={(configId) => navigation.navigate('ServerDetail', { configId })}
            onAddServer={() => navigation.navigate('AddServer')}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default ServerSettingsScreen;
