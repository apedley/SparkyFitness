import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Constants from 'expo-constants';
import SettingsIndexScreen from './SettingsIndexScreen';
import ServerSettingsScreen from './ServerSettingsScreen';
import ServerEditScreen from './ServerEditScreen';
import HealthDataSettingsScreen from './HealthDataSettingsScreen';
import AppearanceSettingsScreen from './AppearanceSettingsScreen';
import AboutScreen from './AboutScreen';
import DevToolsSettingsScreen from './DevToolsSettingsScreen';
import LogScreen from '../LogScreen';
import type { SettingsStackParamList } from '../../types/settingsNavigation';

const Stack = createStackNavigator<SettingsStackParamList>();

const SettingsNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SettingsIndex"
        component={SettingsIndexScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ServerSettings"
        component={ServerSettingsScreen}
        options={{ title: 'Server', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name="ServerEditSettings"
        component={ServerEditScreen}
        options={{ title: 'Server', headerBackTitle: 'Server' }}
      />
      <Stack.Screen
        name="HealthDataSettings"
        component={HealthDataSettingsScreen}
        options={{ title: 'Health Sync', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name="AppearanceSettings"
        component={AppearanceSettingsScreen}
        options={{ title: 'Appearance', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name="LogsSettings"
        component={LogScreen}
        options={{ title: 'Logs', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About', headerBackTitle: 'Settings' }}
      />
      {__DEV__ &&
        (Constants.expoConfig?.extra?.APP_VARIANT === 'development' ||
          Constants.expoConfig?.extra?.APP_VARIANT === 'dev') && (
          <Stack.Screen
            name="DevToolsSettings"
            component={DevToolsSettingsScreen}
            options={{ title: 'Developer Tools', headerBackTitle: 'Settings' }}
          />
        )}
    </Stack.Navigator>
  );
};

export default SettingsNavigator;
