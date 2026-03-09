import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Constants from 'expo-constants';
import SettingsIndexScreen from './SettingsIndexScreen';
import ServerSettingsScreen from './ServerSettingsScreen';
import AddServerScreen from './AddServerScreen';
import ServerDetailScreen from './ServerDetailScreen';
import AuthenticationScreen from './AuthenticationScreen';
import HealthDataSettingsScreen from './HealthDataSettingsScreen';
import AppearanceSettingsScreen from './AppearanceSettingsScreen';
import AboutScreen from './AboutScreen';
import DevToolsSettingsScreen from './DevToolsSettingsScreen';
import LogScreen from '../LogScreen';
import type { SettingsStackParamList } from '../../types/settingsNavigation';

const Stack = createStackNavigator<SettingsStackParamList>();

const SettingsNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsIndex" component={SettingsIndexScreen} />
      <Stack.Screen name="ServerSettings" component={ServerSettingsScreen} />
      <Stack.Screen name="AddServer" component={AddServerScreen} />
      <Stack.Screen name="ServerDetail" component={ServerDetailScreen} />
      <Stack.Screen name="Authentication" component={AuthenticationScreen} />
      <Stack.Screen name="HealthDataSettings" component={HealthDataSettingsScreen} />
      <Stack.Screen name="AppearanceSettings" component={AppearanceSettingsScreen} />
      <Stack.Screen name="LogsSettings" component={LogScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      {__DEV__ &&
        (Constants.expoConfig?.extra?.APP_VARIANT === 'development' ||
          Constants.expoConfig?.extra?.APP_VARIANT === 'dev') && (
          <Stack.Screen name="DevToolsSettings" component={DevToolsSettingsScreen} />
        )}
    </Stack.Navigator>
  );
};

export default SettingsNavigator;
