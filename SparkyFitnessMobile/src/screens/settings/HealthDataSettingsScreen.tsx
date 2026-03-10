import React, { useState, useEffect, useMemo } from 'react';
import { View, Alert, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import { addLog } from '../../services/LogService';
import { initHealthConnect, requestHealthPermissions, saveHealthPreference, loadHealthPreference, enableBackgroundDeliveryForMetric, disableBackgroundDeliveryForMetric, setupBackgroundDeliveryForEnabledMetrics, disableAllBackgroundDelivery, cleanupAllSubscriptions, refreshSubscriptions } from '../../services/healthConnectService';
import { HEALTH_METRICS } from '../../HealthMetrics';
import type { HealthMetric } from '../../HealthMetrics';
import HealthDataSync from '../../components/HealthDataSync';
import type { HealthMetricStates } from '../../types/healthRecords';

const HealthDataSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [healthMetricStates, setHealthMetricStates] = useState<HealthMetricStates>(
    HEALTH_METRICS.reduce((acc, metric) => ({ ...acc, [metric.stateKey]: false }), {} as HealthMetricStates)
  );
  const isAllMetricsEnabled = useMemo(
    () => HEALTH_METRICS.every(metric => healthMetricStates[metric.stateKey]),
    [healthMetricStates]
  );

  const healthSettingsName = Platform.OS === 'android' ? 'Health Connect settings' : 'Health app settings';

  useEffect(() => {
    const loadSettings = async () => {
      const newHealthMetricStates: HealthMetricStates = {};
      for (const metric of HEALTH_METRICS) {
        const enabled = await loadHealthPreference<boolean>(metric.preferenceKey);
        newHealthMetricStates[metric.stateKey] = enabled === true;
      }
      setHealthMetricStates(newHealthMetricStates);

      await initHealthConnect();
    };
    loadSettings();
  }, []);

  const handleToggleHealthMetric = async (
    metric: HealthMetric,
    newValue: boolean
  ): Promise<void> => {
    setHealthMetricStates(prevStates => ({
      ...prevStates,
      [metric.stateKey]: newValue,
    }));
    await saveHealthPreference(metric.preferenceKey, newValue);
    if (!newValue) {
      disableBackgroundDeliveryForMetric(metric.recordType).catch(() => {});
    }
    if (newValue) {
      try {
        const granted = await requestHealthPermissions(metric.permissions);
        if (!granted) {
          Alert.alert('Permission Denied', `Please grant ${metric.label.toLowerCase()} permission in ${healthSettingsName}.`);
          setHealthMetricStates(prevStates => ({
            ...prevStates,
            [metric.stateKey]: false,
          }));
          await saveHealthPreference(metric.preferenceKey, false);
          addLog(`Permission Denied: ${metric.label} permission not granted.`, 'WARNING');
        } else {
          addLog(`${metric.label} sync enabled and permissions granted.`, 'SUCCESS');
          enableBackgroundDeliveryForMetric(metric.recordType).catch(() => {});
        }
      } catch (permissionError) {
        const errorMessage = permissionError instanceof Error ? permissionError.message : String(permissionError);
        Alert.alert('Permission Error', `Failed to request ${metric.label.toLowerCase()} permissions: ${errorMessage}`);
        setHealthMetricStates(prevStates => ({
          ...prevStates,
          [metric.stateKey]: false,
        }));
        await saveHealthPreference(metric.preferenceKey, false);
        addLog(`Permission Request Error for ${metric.label}: ${errorMessage}`, 'ERROR');
      }
    }
    refreshSubscriptions();
  };

  const handleToggleAllMetrics = async (): Promise<void> => {
    const newValue = !isAllMetricsEnabled;

    const newHealthMetricStates: HealthMetricStates = {};
    HEALTH_METRICS.forEach(metric => {
      newHealthMetricStates[metric.stateKey] = newValue;
    });

    if (newValue) {
      const allPermissions = HEALTH_METRICS.flatMap(metric => metric.permissions);
      addLog(`[HealthDataSettings] Requesting permissions for all ${HEALTH_METRICS.length} metrics`, 'DEBUG');

      try {
        const granted = await requestHealthPermissions(allPermissions);

        if (!granted) {
          Alert.alert(
            'Permissions Required',
            `Some permissions were not granted. Please enable all required health permissions in the ${healthSettingsName} to sync all data.`
          );
          HEALTH_METRICS.forEach(metric => {
            newHealthMetricStates[metric.stateKey] = false;
          });
          addLog('[HealthDataSettings] Not all permissions were granted. Reverting "Enable All".', 'WARNING');
        } else {
          addLog(`[HealthDataSettings] All ${HEALTH_METRICS.length} metric permissions granted`, 'SUCCESS');
        }
      } catch (permissionError) {
        const errorMessage = permissionError instanceof Error ? permissionError.message : String(permissionError);
        Alert.alert('Permission Error', `An error occurred while requesting health permissions: ${errorMessage}`);
        HEALTH_METRICS.forEach(metric => {
          newHealthMetricStates[metric.stateKey] = false;
        });
        addLog(`[HealthDataSettings] Error requesting all permissions: ${errorMessage}`, 'ERROR');
      }
    } else {
      addLog(`[HealthDataSettings] Disabling all ${HEALTH_METRICS.length} metrics`, 'DEBUG');
      disableAllBackgroundDelivery().catch(() => {});
      cleanupAllSubscriptions();
    }

    setHealthMetricStates(newHealthMetricStates);

    const saveErrors: string[] = [];
    for (const metric of HEALTH_METRICS) {
      try {
        await saveHealthPreference(metric.preferenceKey, newHealthMetricStates[metric.stateKey]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        saveErrors.push(`${metric.label}: ${errorMessage}`);
      }
    }

    if (saveErrors.length > 0) {
      addLog(`[HealthDataSettings] Failed to save ${saveErrors.length}/${HEALTH_METRICS.length} metric preferences`, 'WARNING', saveErrors);
    }

    if (newValue) {
      setupBackgroundDeliveryForEnabledMetrics().catch(() => {});
    }

    refreshSubscriptions();
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Health Data Sync" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="p-4">
        <HealthDataSync
          healthMetricStates={healthMetricStates}
          handleToggleHealthMetric={handleToggleHealthMetric}
          isAllMetricsEnabled={isAllMetricsEnabled}
          handleToggleAllMetrics={handleToggleAllMetrics}
        />
        </View>
      </ScrollView>
    </View>
  );
};

export default HealthDataSettingsScreen;
