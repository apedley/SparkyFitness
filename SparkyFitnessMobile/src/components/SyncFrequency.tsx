import React from 'react';
import { View, Text, Platform } from 'react-native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { saveSyncDuration, saveStringPreference } from '../services/healthConnectService';
import type { SyncInterval } from '../services/healthconnect/preferences';
import BottomSheetPicker from './BottomSheetPicker';
import { useCSSVariable } from 'uniwind';

interface SyncFrequencyProps {
  syncDuration: SyncInterval;
  setSyncDuration: React.Dispatch<React.SetStateAction<SyncInterval>>;
  fourHourSyncTime: string;
  setFourHourSyncTime: React.Dispatch<React.SetStateAction<string>>;
  dailySyncTime: string;
  setDailySyncTime: React.Dispatch<React.SetStateAction<string>>;
}

const SYNC_INTERVAL_VALUES: SyncInterval[] = ['1h', '4h', '24h'];
const SYNC_INTERVAL_LABELS = ['Hourly', '4 Hours', 'Daily'];

const SyncFrequency: React.FC<SyncFrequencyProps> = ({
  syncDuration,
  setSyncDuration,
  fourHourSyncTime,
  setFourHourSyncTime,
  dailySyncTime,
  setDailySyncTime,
}) => {
  const [inputBackground, tagBackground, primary, textSecondary] = useCSSVariable([
    '--color-surface-secondary',
    '--color-bg-tertiary',
    '--color-accent-primary',
    '--color-text-secondary',
  ]) as [string, string, string, string];

  const fourHourTimeItems = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map(time => ({ label: time, value: time }));

  const dailyTimeItems = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return { label: `${hour}:00`, value: `${hour}:00` };
  });

  const selectedSyncIndex = SYNC_INTERVAL_VALUES.indexOf(syncDuration);

  const handleSyncIntervalChange = (index: number) => {
    const newValue = SYNC_INTERVAL_VALUES[index];
    setSyncDuration(newValue);
    saveSyncDuration(newValue);
  };

  return (
    <View className="bg-surface-primary rounded-xl p-4 mb-4">
      <Text className="text-lg font-bold mb-3 text-text-primary">Background Sync Frequency</Text>

      <View className="mb-3">
        <Text className="text-sm mb-2 text-text-secondary">Sync Interval</Text>
        <SegmentedControl
          values={SYNC_INTERVAL_LABELS}
          selectedIndex={selectedSyncIndex}
          onChange={(event) => handleSyncIntervalChange(event.nativeEvent.selectedSegmentIndex)}
          backgroundColor={Platform.OS === 'ios' ? inputBackground : tagBackground}
          tintColor={primary}
          fontStyle={{ color: textSecondary }}
          activeFontStyle={{ color: '#FFFFFF' }}
          style={{ marginVertical: 8 }}
        />
      </View>

      {syncDuration === '4h' && (
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-base text-text-primary">Sync Time</Text>
          <BottomSheetPicker
            value={fourHourSyncTime}
            options={fourHourTimeItems}
            onSelect={(value) => {
              setFourHourSyncTime(value);
              saveStringPreference('fourHourSyncTime', value);
            }}
            title="Sync Time"
            containerStyle={{ flex: 1, maxWidth: 200 }}
          />
        </View>
      )}

      {syncDuration === '24h' && (
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-base text-text-primary">Sync Time</Text>
          <BottomSheetPicker
            value={dailySyncTime}
            options={dailyTimeItems}
            onSelect={(value) => {
              setDailySyncTime(value);
              saveStringPreference('dailySyncTime', value);
            }}
            title="Sync Time"
            containerStyle={{ flex: 1, maxWidth: 200 }}
          />
        </View>
      )}
    </View>
  );
};

export default SyncFrequency;
