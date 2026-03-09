import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import type { StackScreenProps } from '@react-navigation/stack';
import type { OnboardingStackParamList } from '../../types/onboardingNavigation';
import type { RootStackParamList } from '../../types/navigation';
import { getAllServerConfigs, saveOnboardingComplete } from '../../services/storage';
import type { ServerConfig } from '../../services/storage';
import { useProxyHeadersLifecycle } from '../../hooks';
import SegmentedControl from '../../components/SegmentedControl';
import SignInForm from '../settings/SignInForm';
import ApiKeyForm from '../settings/ApiKeyForm';
import Icon from '../../components/Icon';

type OnboardingAuthScreenProps = StackScreenProps<OnboardingStackParamList, 'OnboardingAuth'>;

const authSegments = [
  { key: 'session' as const, label: 'Sign In' },
  { key: 'apiKey' as const, label: 'API Key' },
];

const OnboardingAuthScreen: React.FC<OnboardingAuthScreenProps> = ({ route, navigation }) => {
  const { configId } = route.params;
  const insets = useSafeAreaInsets();
  const [accentPrimary] = useCSSVariable(['--color-accent-primary']) as [string];

  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [authMethod, setAuthMethod] = useState<'session' | 'apiKey'>('session');

  const loadConfig = useCallback(async () => {
    const configs = await getAllServerConfigs();
    const found = configs.find(c => c.id === configId) ?? null;
    setConfig(found);
  }, [configId]);

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [loadConfig])
  );

  useProxyHeadersLifecycle(config?.proxyHeaders);

  const handleAuthSuccess = async () => {
    await saveOnboardingComplete();
    navigation.getParent<StackScreenProps<RootStackParamList>['navigation']>()
      ?.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  if (!config) return null;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ paddingTop: insets.top + 8 }} className="px-4 pb-2">
        <TouchableOpacity
          className="flex-row items-center py-2"
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="chevron-back" size={20} color={accentPrimary} />
          <Text className="text-base" style={{ color: accentPrimary }}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-text-primary text-center mb-6">
          Sign In
        </Text>

        <View className="mb-4">
          <SegmentedControl
            segments={authSegments}
            activeKey={authMethod}
            onSelect={setAuthMethod}
          />
        </View>

        {authMethod === 'session' ? (
          <SignInForm config={config} onSuccess={handleAuthSuccess} />
        ) : (
          <ApiKeyForm config={config} onSuccess={handleAuthSuccess} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default OnboardingAuthScreen;
