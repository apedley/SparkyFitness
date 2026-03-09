import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useCSSVariable } from 'uniwind';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { NativeBottomTabScreenProps } from '@bottom-tabs/react-navigation';
import type { RootStackParamList, TabParamList } from '../../types/navigation';
import type { SettingsStackParamList } from '../../types/settingsNavigation';
import { getAllServerConfigs, saveServerConfig } from '../../services/storage';
import type { ServerConfig } from '../../services/storage';
import { queryClient, serverConnectionQueryKey } from '../../hooks';
import Icon from '../../components/Icon';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';

type ApiKeyScreenProps = CompositeScreenProps<
  StackScreenProps<SettingsStackParamList, 'ApiKeySettings'>,
  CompositeScreenProps<
    NativeBottomTabScreenProps<TabParamList, 'Settings'>,
    StackScreenProps<RootStackParamList>
  >
>;

const ApiKeyScreen: React.FC<ApiKeyScreenProps> = ({ route, navigation }) => {
  const { configId } = route.params;
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [apiKey, setApiKey] = useState('');

  const [textMuted, textSecondary] = useCSSVariable([
    '--color-text-muted',
    '--color-text-secondary',
  ]) as [string, string];

  useEffect(() => {
    const load = async () => {
      const configs = await getAllServerConfigs();
      const found = configs.find(c => c.id === configId) ?? null;
      setConfig(found);
    };
    load();
  }, [configId]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Missing API Key', 'Please enter an API key.');
      return;
    }
    if (!config) return;

    if (!__DEV__ && !config.url.startsWith('https://')) {
      Alert.alert('Insecure URL', 'HTTPS is required for server connections.');
      return;
    }

    await saveServerConfig({
      ...config,
      apiKey: apiKey.trim(),
      authType: 'apiKey',
      sessionToken: '',
      email: undefined,
    });

    queryClient.invalidateQueries({ queryKey: serverConnectionQueryKey });
    navigation.goBack();
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <SettingsGroup title="Server">
        <SettingsRow label={config?.url ?? '...'} />
      </SettingsGroup>

      <SettingsGroup title="API Key">
        <View className="px-4 py-3">
          <View className="flex-row items-center">
            <TextInput
              className="flex-1 text-base text-text-primary"
              placeholder="Uds3d8i..."
              placeholderTextColor={textMuted}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              autoFocus
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

      <TouchableOpacity
        className="items-center justify-center py-3.5 rounded-[10px] bg-accent-primary mx-4"
        onPress={handleSave}
        activeOpacity={0.8}
      >
        <Text className="text-white text-[17px] font-semibold">Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ApiKeyScreen;
