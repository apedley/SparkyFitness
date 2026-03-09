import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { ServerConfig as ServerConfigType } from '../services/storage';
import Icon from './Icon';
import SettingsGroup from './settings/SettingsGroup';
import SettingsRow from './settings/SettingsRow';

interface ServerConfigProps {
  serverConfigs: ServerConfigType[];
  activeConfigId: string | null;
  onActivateServer: (id: string) => void;
  onEditServer: (configId: string) => void;
  onAddServer: () => void;
}

const ServerConfig: React.FC<ServerConfigProps> = ({
  serverConfigs,
  activeConfigId,
  onActivateServer,
  onEditServer,
  onAddServer,
}) => {
  const [accentPrimary] = useCSSVariable([
    '--color-accent-primary',
  ]) as [string];

  return (
    <SettingsGroup>
      {serverConfigs.map((item) => {
        const isActive = item.id === activeConfigId;

        const leading = (
          <View className="w-7 items-center mr-1">
            {isActive && (
              <Icon name="checkmark" size={18} color={accentPrimary} weight="semibold" />
            )}
          </View>
        );

        const trailing = (
          <TouchableOpacity
            onPress={() => onEditServer(item.id)}
            accessibilityLabel={`Edit ${item.url}`}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="info-circle" size={22} color={accentPrimary} />
          </TouchableOpacity>
        );

        return (
          <SettingsRow
            key={item.id}
            label={item.url}
            onPress={() => onActivateServer(item.id)}
            leading={leading}
            trailing={trailing}
          />
        );
      })}

      <TouchableOpacity
        className="flex-row items-center px-4 py-3"
        onPress={onAddServer}
        accessibilityLabel="Add new server"
        accessibilityRole="button"
      >
        <Text className="text-base flex-1" style={{ color: accentPrimary }}>
          Add Server...
        </Text>
      </TouchableOpacity>
    </SettingsGroup>
  );
};

export default ServerConfig;
