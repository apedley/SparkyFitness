import './global.css'
import React, { useEffect, useState } from 'react';
import { StatusBar, Platform, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { useUniwind, useCSSVariable } from 'uniwind';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from './src/hooks';

import { createStackNavigator } from '@react-navigation/stack';
import MainScreen from './src/screens/MainScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import LogScreen from './src/screens/LogScreen';
import { configureBackgroundSync } from './src/services/backgroundSyncService';
import { initializeTheme } from './src/services/themeService';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';

const Tab = createNativeBottomTabNavigator();
const Stack = createStackNavigator();

type TabIcons = {
  sync: ImageSourcePropType;
  chart: ImageSourcePropType;
  settings: ImageSourcePropType;
};

function AppContent() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const [primary, textMuted, navBar] = useCSSVariable([
    '--color-primary',
    '--color-text-muted',
    '--color-navbar',
  ]) as [string, string, string];
  const [icons, setIcons] = useState<TabIcons | null>(null);

  // Determine if we're in dark mode based on current theme
  const isDarkMode = theme === 'dark' || theme === 'amoled';

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      Promise.all([
        Ionicons.getImageSource('sync', 24, '#999999'),
        Ionicons.getImageSource('bar-chart', 24, '#999999'),
        Ionicons.getImageSource('settings', 24, '#999999'),
      ]).then(([sync, chart, settings]) => {
        if (sync && chart && settings) {
          setIcons({ sync, chart, settings });
        }
      });
    }
  }, []);

  useEffect(() => {
    // Initialize theme from storage on app start
    initializeTheme();

    // Reset the auto-open flag on every app start
    const initializeApp = async () => {
      // Remove the flag so the dashboard will auto-open on first MainScreen visit
      await AsyncStorage.removeItem('@HealthConnect:hasAutoOpenedDashboard');
    };

    initializeApp();

    // Configure background sync without blocking app startup
    configureBackgroundSync().catch(error => {
      console.error('[App] Failed to configure background sync:', error);
    });
  }, []);

  if (Platform.OS !== 'ios' && !icons) {
    return null;
  }

  return (
    <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs">
            {() => (
              <Tab.Navigator
                initialRouteName="Sync"
                tabBarActiveTintColor={primary}
                tabBarInactiveTintColor={textMuted}
                activeIndicatorColor={isDarkMode ? '#424242' : '#E7EAEC'}
                tabBarStyle={Platform.OS !== 'ios' ? { backgroundColor: navBar } : undefined}
              >
                <Tab.Screen
                  name="Sync"
                  component={MainScreen}
                  options={{
                    tabBarIcon: () =>
                      Platform.OS === 'ios' ? { sfSymbol: 'arrow.triangle.2.circlepath' } : icons!.sync,
                  }}
                />
                <Tab.Screen
                  name="Summary"
                  component={SummaryScreen}
                  options={{
                    tabBarIcon: () =>
                      Platform.OS === 'ios' ? { sfSymbol: 'chart.bar.fill' } : icons!.chart,
                  }}
                />
                <Tab.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{
                    tabBarIcon: () =>
                      Platform.OS === 'ios' ? { sfSymbol: 'gearshape.fill' } : icons!.settings,
                  }}
                />
              </Tab.Navigator>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Logs"
            component={LogScreen}
            options={{
              headerShown: true,
              title: 'Logs',
            }}
          />
        </Stack.Navigator>
      </SafeAreaProvider>
    </NavigationContainer>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView className="flex-1">
        <BottomSheetModalProvider>
          <AppContent />
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

export default App;
