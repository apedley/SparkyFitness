import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { OnboardingStackParamList } from '../../types/onboardingNavigation';
import WelcomeScreen from './WelcomeScreen';
import OnboardingAuthScreen from './OnboardingAuthScreen';

const Stack = createStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="OnboardingAuth" component={OnboardingAuthScreen} />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
