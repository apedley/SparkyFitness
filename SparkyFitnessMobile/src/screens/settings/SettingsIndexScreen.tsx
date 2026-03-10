import React, { useState, useCallback } from 'react';
import { View, ScrollView, Switch, Text, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCSSVariable } from 'uniwind';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useThemePreference } from '../../services/themeService';
import { loadHealthPreference, requestHealthPermissions, startObservers, stopObservers } from '../../services/healthConnectService';
import { getActiveServerConfig, loadBackgroundSyncEnabled, saveBackgroundSyncEnabled } from '../../services/storage';
import { configureBackgroundSync, stopBackgroundSync, performBackgroundSync } from '../../services/backgroundSyncService';
import { addLog } from '../../services/LogService';
import { HEALTH_METRICS } from '../../HealthMetrics';
import ScreenHeader from '../../components/ScreenHeader';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import type { StackScreenProps } from '@react-navigation/stack';
import type { SettingsStackParamList } from '../../types/settingsNavigation';

type SettingsIndexScreenProps = StackScreenProps<SettingsStackParamList, 'SettingsIndex'>;

const SettingsIndexScreen: React.FC<SettingsIndexScreenProps> = ({ navigation }) => {
  const appTheme = useThemePreference();
  const [enabledMetricCount, setEnabledMetricCount] = useState<number>(0);
  const [activeServerUrl, setActiveServerUrl] = useState<string | null>(null);
  const [isBackgroundSyncEnabled, setIsBackgroundSyncEnabled] = useState<boolean>(false);
  const [formEnabled, formDisabled] = useCSSVariable([
    '--color-form-enabled',
    '--color-form-disabled',
  ]) as [string, string];

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

        const bgSyncEnabled = await loadBackgroundSyncEnabled();
        setIsBackgroundSyncEnabled(bgSyncEnabled);
      };
      load();
    }, [])
  );

  const handleToggleBackgroundSync = async (newValue: boolean) => {
    if (newValue && Platform.OS === 'android') {
      try {
        const granted = await requestHealthPermissions([
          { accessType: 'read', recordType: 'BackgroundAccessPermission' },
        ]);
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Background access permission is required for background sync. Please grant the permission in Health Connect settings.'
          );
          return;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Alert.alert('Permission Error', `Failed to request background access permission: ${errorMessage}`);
        addLog(`[Settings] Background access permission error: ${errorMessage}`, 'ERROR');
        return;
      }
    }
    setIsBackgroundSyncEnabled(newValue);
    await saveBackgroundSyncEnabled(newValue);
    if (newValue) {
      await configureBackgroundSync();
      if (Platform.OS === 'ios') {
        startObservers(() => {
          performBackgroundSync('healthkit-observer').catch(error => {
            console.error('[Settings] Observer-triggered sync failed:', error);
          });
        });
      }
    } else {
      await stopBackgroundSync();
      if (Platform.OS === 'ios') {
        stopObservers();
      }
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Settings" />
      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 40 }}>

        <SettingsGroup>
          <SettingsRow
            label="Server"
            subtitle={activeServerUrl ?? 'Not connected'}
            onPress={() => navigation.navigate('ServerSettings')}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            label="Health Data Sync"
            subtitle={`${enabledMetricCount} enabled`}
            onPress={() => navigation.navigate('HealthDataSettings')}
          />
          <SettingsRow
            label="Background Sync"
            trailing={
              <Switch
                onValueChange={handleToggleBackgroundSync}
                value={isBackgroundSyncEnabled}
                trackColor={{ false: formDisabled, true: formEnabled }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </SettingsGroup>
        {Platform.OS === 'ios' && (
          <Text className="text-xs text-text-muted px-4 -mt-3.5 mb-5">
            When enabled, background sync will update health data in the background when your phone allows it. Manually syncing will always update right away.
          </Text>
        )}

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
