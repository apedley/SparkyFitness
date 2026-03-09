import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useThemePreference } from '../../services/themeService';
import { loadHealthPreference } from '../../services/healthConnectService';
import { getActiveServerConfig } from '../../services/storage';
import { HEALTH_METRICS } from '../../HealthMetrics';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import type { StackScreenProps } from '@react-navigation/stack';
import type { SettingsStackParamList } from '../../types/settingsNavigation';

type SettingsIndexScreenProps = StackScreenProps<SettingsStackParamList, 'SettingsIndex'>;

const SettingsIndexScreen: React.FC<SettingsIndexScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const appTheme = useThemePreference();
  const [enabledMetricCount, setEnabledMetricCount] = useState<number>(0);
  const [activeServerUrl, setActiveServerUrl] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        let count = 0;
        for (const metric of HEALTH_METRICS) {
          const enabled = await loadHealthPreference<boolean>(metric.preferenceKey);
          if (enabled === true) count++;
        }
        setEnabledMetricCount(count);

        const activeConfig = await getActiveServerConfig();
        setActiveServerUrl(activeConfig?.url ?? null);
      };
      load();
    }, [])
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="px-4" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}>
        <Text className="text-3xl font-bold text-text-primary px-4 pt-2 pb-4">Settings</Text>

        <SettingsGroup>
          <SettingsRow
            label="Server"
            subtitle={activeServerUrl ?? 'Not connected'}
            onPress={() => navigation.navigate('ServerSettings')}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            label="Health Sync"
            subtitle={`${enabledMetricCount} enabled`}
            onPress={() => navigation.navigate('HealthDataSettings')}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            label="Appearance"
            subtitle={appTheme}
            onPress={() => navigation.navigate('AppearanceSettings')}
          />
          <SettingsRow
            label="Logs"
            onPress={() => navigation.navigate('LogsSettings')}
          />
          <SettingsRow
            label="About"
            subtitle={`Version ${Application.nativeApplicationVersion}`}
            onPress={() => navigation.navigate('About')}
          />
        </SettingsGroup>

        {__DEV__ &&
          (Constants.expoConfig?.extra?.APP_VARIANT === 'development' ||
            Constants.expoConfig?.extra?.APP_VARIANT === 'dev') && (
            <SettingsGroup>
              <SettingsRow
                label="Developer Tools"
                subtitle="Tests and debugging"
                subtitleBelow
                onPress={() => navigation.navigate('DevToolsSettings')}
              />
            </SettingsGroup>
          )}
      </ScrollView>
    </View>
  );
};

export default SettingsIndexScreen;
