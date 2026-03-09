import React, { useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import * as Application from 'expo-application';
import PrivacyPolicyModal from '../../components/PrivacyPolicyModal';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import { useServerConnection, usePreferences, queryClient } from '../../hooks';
import { shareDiagnosticReport, sanitizeQueryKey } from '../../services/diagnosticReportService';
import type { DiagnosticQueryState } from '../../types/diagnosticReport';

const AboutScreen: React.FC = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const { isConnected } = useServerConnection();
  const { preferences: userPreferences } = usePreferences({ enabled: isConnected });
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const handleShareDiagnosticReport = async (): Promise<void> => {
    setIsSharing(true);
    try {
      const queryStates: DiagnosticQueryState[] = queryClient
        .getQueryCache()
        .getAll()
        .map((query) => ({
          queryKey: JSON.stringify(sanitizeQueryKey(query.queryKey)),
          status: query.state.status,
          fetchStatus: query.state.fetchStatus,
          isStale: query.isStale(),
          errorMessage: query.state.error instanceof Error
            ? query.state.error.message
            : query.state.error
              ? String(query.state.error)
              : null,
        }));

      await shareDiagnosticReport({
        isServerConnected: isConnected,
        userPreferences: userPreferences ?? null,
        queryStates,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Failed to share diagnostic report: ${errorMessage}`);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background px-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-4 items-center">
        <Image source={require('../../../assets/icons/sparky.png')} className="w-16 h-16 mb-2" />
        <Text className="text-lg font-bold text-text-primary mb-1">SparkyFitness</Text>
        <Text className="text-text-secondary mb-1">
          Version {Application.nativeApplicationVersion} Build {Application.nativeBuildVersion}
        </Text>
      </View>

      <SettingsGroup>
        <SettingsRow
          label="Share Diagnostic Report"
          onPress={handleShareDiagnosticReport}
          trailing={isSharing ? <ActivityIndicator size="small" /> : undefined}
        />
      </SettingsGroup>

      <Text className="text-text-secondary text-sm px-6 mt-1.5 mb-5">
        Exports a local diagnostic report (app version, sync status, logs).{'\n'}
        No personal health or food data is included. Nothing is sent automatically.
      </Text>

      <SettingsGroup>
        <SettingsRow
          label="Privacy Policy"
          onPress={() => setShowPrivacyModal(true)}
        />
      </SettingsGroup>

      <PrivacyPolicyModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </ScrollView>
  );
};

export default AboutScreen;
