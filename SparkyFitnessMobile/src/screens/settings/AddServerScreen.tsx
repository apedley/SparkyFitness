import React, { useEffect, useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useCSSVariable } from 'uniwind';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { NativeBottomTabScreenProps } from '@bottom-tabs/react-navigation';
import type { RootStackParamList, TabParamList } from '../../types/navigation';
import type { SettingsStackParamList } from '../../types/settingsNavigation';
import type { ServerConfig, ProxyHeader } from '../../services/storage';
import { proxyHeadersToRecord } from '../../services/storage';
import { setPendingProxyHeaders, clearPendingProxyHeaders } from '../../services/api/authService';
import Icon from '../../components/Icon';
import ScreenHeader from '../../components/ScreenHeader';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import ProxyHeadersModal from '../../components/ProxyHeadersModal';
import SegmentedControl from '../../components/SegmentedControl';
import SignInForm from './SignInForm';
import ApiKeyForm from './ApiKeyForm';

type AddServerScreenProps = CompositeScreenProps<
  StackScreenProps<SettingsStackParamList, 'AddServer'>,
  CompositeScreenProps<
    NativeBottomTabScreenProps<TabParamList, 'Settings'>,
    StackScreenProps<RootStackParamList>
  >
>;

const authSegments = [
  { key: 'session' as const, label: 'Sign In' },
  { key: 'apiKey' as const, label: 'API Key' },
];

const AddServerScreen: React.FC<AddServerScreenProps> = ({ navigation }) => {
  const [url, setUrl] = useState('');
  const [authMethod, setAuthMethod] = useState<'session' | 'apiKey'>('session');
  const [proxyHeaders, setProxyHeaders] = useState<ProxyHeader[]>([]);
  const [showProxyHeaders, setShowProxyHeaders] = useState(false);
  const configIdRef = useRef(Date.now().toString());
  const [textMuted, textSecondary] = useCSSVariable([
    '--color-text-muted',
    '--color-text-secondary',
  ]) as [string, string];

  useEffect(() => {
    return () => clearPendingProxyHeaders();
  }, []);

  const config: ServerConfig = {
    id: configIdRef.current,
    url: url.trim().replace(/\/+$/, ''),
    apiKey: '',
    ...(proxyHeaders.length ? { proxyHeaders } : {}),
  };

  const handleProxyHeadersSave = (headers: ProxyHeader[]) => {
    setProxyHeaders(headers);
    if (headers.length) {
      setPendingProxyHeaders(proxyHeadersToRecord(headers));
    } else {
      clearPendingProxyHeaders();
    }
  };

  const handleAuthSuccess = () => {
    navigation.replace('ServerDetail', { configId: configIdRef.current });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Add Server" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsGroup title="Server URL">
          <View className="px-4 py-3">
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 text-base text-text-primary"
                placeholder="https://your-server-url.com"
                placeholderTextColor={textMuted}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
                autoFocus
              />
              <TouchableOpacity
                className="p-1 ml-2"
                onPress={async () => setUrl(await Clipboard.getString())}
                accessibilityLabel="Paste URL from clipboard"
                accessibilityRole="button"
              >
                <Icon name="paste" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </SettingsGroup>

        <SettingsGroup title="Advanced">
          <SettingsRow
            label={`Proxy Headers${proxyHeaders.length ? ` (${proxyHeaders.length})` : ''}`}
            onPress={() => setShowProxyHeaders(true)}
          />
        </SettingsGroup>

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

        <ProxyHeadersModal
          visible={showProxyHeaders}
          onClose={() => setShowProxyHeaders(false)}
          headers={proxyHeaders}
          onSave={handleProxyHeadersSave}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AddServerScreen;
