import React from 'react';
import { View, TextInput, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import { useCSSVariable } from 'uniwind';
import { ServerConfig as ServerConfigType } from '../services/storage';
import ConnectionStatus from './ConnectionStatus';

interface ServerConfigProps {
  url: string;
  setUrl: React.Dispatch<React.SetStateAction<string>>;
  apiKey: string;
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
  handleSaveConfig: () => void;
  serverConfigs: ServerConfigType[];
  activeConfigId: string | null;
  handleSetActiveConfig: (id: string) => void;
  handleDeleteConfig: (id: string) => void;
  handleEditConfig: (config: ServerConfigType) => void;
  handleAddNewConfig: () => void;
  isConnected: boolean;
  checkServerConnection: () => Promise<boolean>;
}

const ServerConfig: React.FC<ServerConfigProps> = ({
  url,
  setUrl,
  apiKey,
  setApiKey,
  handleSaveConfig,
  serverConfigs,
  activeConfigId,
  handleSetActiveConfig,
  handleDeleteConfig,
  handleEditConfig,
  handleAddNewConfig,
  isConnected,
  checkServerConnection,
}) => {
  const [textMuted, textSecondary, primary, success, successBackground] = useCSSVariable([
    '--color-text-muted',
    '--color-text-secondary',
    '--color-accent-primary',
    '--color-text-success',
    '--color-bg-success',
  ]) as [string, string, string, string, string];

  const showConfigMenu = (item: ServerConfigType) => {
    const isActive = item.id === activeConfigId;
    Alert.alert(
      item.url,
      isActive ? 'Active configuration' : 'Select an action',
      [
        ...(!isActive ? [{ text: 'Set Active', onPress: () => handleSetActiveConfig(item.id) }] : []),
        { text: 'Edit', onPress: () => handleEditConfig(item) },
        { text: 'Delete', style: 'destructive' as const, onPress: () => handleDeleteConfig(item.id) },
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  return (
    <View>
      {/* Server Configuration */}
      <View className="bg-surface-primary rounded-xl p-4 mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-bold text-text-primary">Server Setup</Text>
          <ConnectionStatus
            isConnected={isConnected}
            hasConfig={!!activeConfigId}
            onRefresh={checkServerConnection}
          />
        </View>
        <View className="mb-3">
          <Text className="text-sm mb-2 text-text-secondary">Server URL</Text>
          <View className="flex-row items-center border border-border-subtle rounded-lg pr-2.5 bg-surface-secondary">
            <TextInput
              className="flex-1 p-2.5 text-base text-text-primary"
              placeholder="https://your-server-url.com"
              placeholderTextColor={textMuted}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity
              className="p-2"
              onPress={() => Clipboard.setString(url)}
              accessibilityLabel="Copy URL to clipboard"
              accessibilityRole="button"
            >
              <Ionicons name="copy-outline" size={20} color={textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-2"
              onPress={async () => setUrl(await Clipboard.getString())}
              accessibilityLabel="Paste URL from clipboard"
              accessibilityRole="button"
            >
              <Ionicons name="clipboard-outline" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View className="mb-3">
          <Text className="text-sm mb-2 text-text-secondary">API Key</Text>
          <View className="flex-row items-center border border-border-subtle rounded-lg pr-2.5 bg-surface-secondary">
            <TextInput
              className="flex-1 p-2.5 text-base text-text-primary"
              placeholder="Enter your API key"
              placeholderTextColor={textMuted}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
            />
            <TouchableOpacity
              className="p-2"
              onPress={() => Clipboard.setString(apiKey)}
              accessibilityLabel="Copy API key to clipboard"
              accessibilityRole="button"
            >
              <Ionicons name="copy-outline" size={20} color={textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-2"
              onPress={async () => setApiKey(await Clipboard.getString())}
              accessibilityLabel="Paste API key from clipboard"
              accessibilityRole="button"
            >
              <Ionicons name="clipboard-outline" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          className="bg-accent-primary py-3 px-6 rounded-lg my-1 items-center self-center"
          onPress={handleSaveConfig}
        >
          <Text className="text-white text-base font-bold">Save Current Config</Text>
        </TouchableOpacity>
      </View>

      {/* Display existing configurations */}
      <View className="bg-surface-primary rounded-xl p-4 mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-bold text-text-primary">Manage Configurations</Text>
          <TouchableOpacity
            onPress={handleAddNewConfig}
            accessibilityLabel="Add new configuration"
            accessibilityRole="button"
            className="w-11 h-11 justify-center items-center"
          >
            <Ionicons name="add-circle-outline" size={28} color={primary} />
          </TouchableOpacity>
        </View>
        {serverConfigs.map((item) => (
          <View key={item.id} className="py-0.5 flex-row items-center">
            <View className="flex-1 flex-row items-center gap-2">
              <Text
                className="text-sm text-text-primary shrink max-w-[80%]"
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {item.url}
              </Text>
              {item.id === activeConfigId && (
                <View
                  className="w-6 h-6 rounded-xl justify-center items-center"
                  style={{ backgroundColor: successBackground }}
                >
                  <Text className="text-sm font-bold" style={{ color: success }}>✓</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              className="w-11 h-11 justify-center items-center"
              onPress={() => showConfigMenu(item)}
              accessibilityLabel={`Options for ${item.url}`}
              accessibilityRole="button"
            >
              <Text className="text-xl font-bold text-text-secondary">⋮</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

    </View>
  );
};

export default ServerConfig;
