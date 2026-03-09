import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { ServerConfig as ServerConfigType } from '../services/storage';
import SettingsGroup from './settings/SettingsGroup';
import SettingsRow from './settings/SettingsRow';

interface ServerConfigProps {
  serverConfigs: ServerConfigType[];
  activeConfigId: string | null;
  onEditServer: (configId: string) => void;
  onAddServer: () => void;
}

function getStatusText(config: ServerConfigType, isActive: boolean): string {
  const parts: string[] = [];
  if (isActive) parts.push('Active');
  if (config.authType === 'session' && config.sessionToken) {
    parts.push(config.email ? `Signed in as ${config.email}` : 'Signed in');
  } else if (config.authType === 'apiKey' && config.apiKey) {
    parts.push('API key');
  } else {
    parts.push('Not configured');
  }
  return parts.join(' \u00B7 ');
}

const ServerConfig: React.FC<ServerConfigProps> = ({
  serverConfigs,
  activeConfigId,
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
        const status = getStatusText(item, isActive);

        return (
          <SettingsRow
            key={item.id}
            label={item.url}
            subtitle={status}
            subtitleBelow
            onPress={() => onEditServer(item.id)}
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
