import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

// Module-level flag - resets when app is fully killed and relaunched
let hasShownThisSession = false;

export const shouldShowOnboardingModal = (): boolean => {
  return !hasShownThisSession;
};

export const markOnboardingShown = (): void => {
  hasShownThisSession = true;
};

// Useful for testing
export const resetOnboardingModal = (): void => {
  hasShownThisSession = false;
};

interface OnboardingModalProps {
  visible: boolean;
  onGoToSettings: () => void;
  onDismiss: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  onGoToSettings,
  onDismiss,
}) => {
  const primary = useCSSVariable('--color-primary') as string;

  const handleGoToSettings = () => {
    markOnboardingShown();
    onGoToSettings();
  };

  const handleDismiss = () => {
    markOnboardingShown();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View
        className="flex-1 justify-center items-center p-6"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <View className="w-full max-w-[360px] rounded-2xl p-6 bg-card">
          {/* Header */}
          <View className="items-center mb-5">
            <Image
              source={require('../../assets/images/logo.png')}
              className="w-16 h-16"
              resizeMode="contain"
            />
            <Text className="text-[22px] font-bold mt-3 text-center text-text">
              Welcome to SparkyFitness
            </Text>
          </View>

          {/* Content */}
          <View className="mb-6">
            <Text className="text-base leading-6 text-center mb-5 text-text-secondary">
              To get started, configure your server connection. This tells the app where to sync your health data.
            </Text>

            {/* Privacy Section */}
            <View className="flex-row p-4 rounded-xl bg-background">
              <Ionicons name="shield-checkmark-outline" size={24} color={primary} className="mr-3 mt-0.5" />
              <View className="flex-1">
                <Text className="text-[15px] font-semibold mb-1 text-text">
                  Your Privacy Matters
                </Text>
                <Text className="text-sm leading-5 text-text-secondary">
                  We do not collect or store any of your data. All health information is sent directly to your own server.
                </Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              className="flex-row items-center justify-center py-3.5 rounded-[10px] bg-primary"
              onPress={handleGoToSettings}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={20} color="#fff" className="mr-2" />
              <Text className="text-white text-[17px] font-semibold">Go to Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center py-2.5"
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <Text className="text-base text-text-muted">
                Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default OnboardingModal;
