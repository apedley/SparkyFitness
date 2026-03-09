import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useCSSVariable } from 'uniwind';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { NativeBottomTabScreenProps } from '@bottom-tabs/react-navigation';
import type { RootStackParamList, TabParamList } from '../../types/navigation';
import type { SettingsStackParamList } from '../../types/settingsNavigation';
import { saveServerConfig } from '../../services/storage';
import Icon from '../../components/Icon';
import SettingsGroup from '../../components/settings/SettingsGroup';

type AddServerScreenProps = CompositeScreenProps<
  StackScreenProps<SettingsStackParamList, 'AddServer'>,
  CompositeScreenProps<
    NativeBottomTabScreenProps<TabParamList, 'Settings'>,
    StackScreenProps<RootStackParamList>
  >
>;

const AddServerScreen: React.FC<AddServerScreenProps> = ({ navigation }) => {
  const [url, setUrl] = useState('');
  const [textMuted, textSecondary] = useCSSVariable([
    '--color-text-muted',
    '--color-text-secondary',
  ]) as [string, string];

  const handleNext = async () => {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed) {
      Alert.alert('Missing URL', 'Please enter a server URL.');
      return;
    }
    if (!__DEV__ && !trimmed.startsWith('https://')) {
      Alert.alert('Insecure URL', 'Please use an HTTPS URL.');
      return;
    }

    const configId = Date.now().toString();
    await saveServerConfig({
      id: configId,
      url: trimmed,
      apiKey: '',
    });

    navigation.replace('ServerDetail', { configId });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
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
              autoFocus
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

      <TouchableOpacity
        className="items-center justify-center py-3.5 rounded-[10px] bg-accent-primary mx-4"
        onPress={handleNext}
        activeOpacity={0.8}
      >
        <Text className="text-white text-[17px] font-semibold">Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddServerScreen;
