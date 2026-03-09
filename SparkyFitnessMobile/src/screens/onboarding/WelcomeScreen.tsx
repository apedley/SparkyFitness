import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import type { StackScreenProps } from '@react-navigation/stack';
import type { OnboardingStackParamList } from '../../types/onboardingNavigation';
import type { RootStackParamList } from '../../types/navigation';
import { saveServerConfig, saveOnboardingComplete } from '../../services/storage';

type WelcomeScreenProps = StackScreenProps<OnboardingStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [textMuted, accentPrimary] = useCSSVariable([
    '--color-text-muted',
    '--color-accent-primary',
  ]) as [string, string];

  const handleContinue = async () => {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed) {
      setError('Please enter a server URL.');
      return;
    }
    if (!__DEV__ && !trimmed.startsWith('https://')) {
      setError('Please use an HTTPS URL.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${trimmed}/api/auth/settings`);
      if (!response.ok) {
        setError('Could not connect to server. Check the URL and try again.');
        return;
      }
    } catch {
      setError('Could not connect to server. Check the URL and try again.');
      return;
    } finally {
      setLoading(false);
    }

    const configId = Date.now().toString();
    await saveServerConfig({
      id: configId,
      url: trimmed,
      apiKey: '',
    });

    navigation.navigate('OnboardingAuth', { configId });
  };

  const handleSetUpLater = async () => {
    await saveOnboardingComplete();
    navigation.getParent<StackScreenProps<RootStackParamList>['navigation']>()
      ?.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 24,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >

        <View className="flex-1" />

        <View className="bg-surface rounded-xl py-2 px-3 mb-3 shadow-sm">

          <View className="items-center mt-2 mb-2">
            <Image source={require('../../../assets/icons/sparky.png')} className="w-20 h-20" />
          </View>

          <View className="items-center mb-4">
            <Text className="text-3xl font-bold text-text-primary mb-2">
              Connect Your Server
            </Text>
            <Text className="text-base text-text-secondary text-center leading-6">
              Connect your server to sign in and sync
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-sm mb-1 text-text-secondary">SparkyFitness URL</Text>
            <View className="border border-border-subtle rounded-lg bg-raised">
              <TextInput
                className="p-3 text-base text-text-primary"
                placeholder="https://fitness.example.com"
                placeholderTextColor={textMuted}
                value={url}
                onChangeText={(text) => { setUrl(text); setError(''); }}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {error !== '' && (
            <View className="mb-4 p-3 rounded-lg bg-status-danger-bg">
              <Text className="text-sm text-status-danger-text">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            className="items-center justify-center py-3.5 rounded-[10px] bg-accent-primary mb-4"
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-[17px] font-semibold">Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-3"
            onPress={handleSetUpLater}
            activeOpacity={0.7}
          >
            <Text className="text-base" style={{ color: accentPrimary }}>
              Continue Without Server
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1" />

        <Text className="text-xs text-text-muted text-start leading-4 mb-8">
          For fitness and wellness tracking only. Not medical advice. Consult a
          healthcare professional for medical advice, diagnosis, or treatment.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default WelcomeScreen;
