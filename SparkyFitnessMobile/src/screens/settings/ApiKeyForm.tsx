import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useCSSVariable } from 'uniwind';
import { saveServerConfig, setActiveServerConfig } from '../../services/storage';
import type { ServerConfig } from '../../services/storage';
import { invalidateServerConnection } from '../../hooks';
import Icon from '../../components/Icon';

type ApiKeyFormProps = {
  config: ServerConfig;
  onSuccess: () => void;
};

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ config, onSuccess }) => {
  const [apiKey, setApiKey] = useState('');

  const [textMuted, textSecondary] = useCSSVariable([
    '--color-text-muted',
    '--color-text-secondary',
  ]) as [string, string];

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Missing API Key', 'Please enter an API key.');
      return;
    }

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
    await setActiveServerConfig(config.id);

    invalidateServerConnection();
    onSuccess();
  };

  return (
    <>
      <View className="flex-row items-center border border-border-subtle rounded-lg bg-raised mb-4">
        <TextInput
          className="flex-1 p-2.5 text-base text-text-primary"
          placeholder="Uds3d8i..."
          placeholderTextColor={textMuted}
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
        />
        <TouchableOpacity
          className="p-2.5"
          onPress={async () => setApiKey(await Clipboard.getString())}
          accessibilityLabel="Paste API key from clipboard"
          accessibilityRole="button"
        >
          <Icon name="paste" size={20} color={textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="items-center justify-center py-3.5 rounded-[10px] bg-accent-primary"
        onPress={handleSave}
        activeOpacity={0.8}
      >
        <Text className="text-white text-[17px] font-semibold">Save</Text>
      </TouchableOpacity>
    </>
  );
};

export default ApiKeyForm;
