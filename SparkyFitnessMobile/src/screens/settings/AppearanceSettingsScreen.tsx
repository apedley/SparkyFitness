import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemePreference, setThemePreference, type ThemePreference } from '../../services/themeService';
import Icon from '../../components/Icon';
import ScreenHeader from '../../components/ScreenHeader';
import SettingsGroup from '../../components/settings/SettingsGroup';

const themeOptions: { label: string; value: ThemePreference }[] = [
  { label: 'Light', value: 'Light' },
  { label: 'Dark', value: 'Dark' },
  { label: 'AMOLED', value: 'Amoled' },
  { label: 'System', value: 'System' },
];

const AppearanceSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const currentTheme = useThemePreference();

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Appearance" onBack={() => navigation.goBack()} />
      <View className="px-4">
        <SettingsGroup>
        {themeOptions.map(({ label, value }) => (
          <TouchableOpacity
            key={value}
            className="flex-row items-center px-4 py-3"
            onPress={() => setThemePreference(value)}
          >
            <Text className="text-base text-text-primary flex-1">{label}</Text>
            {currentTheme === value && (
              <Icon name="checkmark" size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
        ))}
        </SettingsGroup>
      </View>
    </View>
  );
};

export default AppearanceSettingsScreen;
