import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import MainScreen from '@/src/screens/MainScreen';
import { NavigationContainer } from '@react-navigation/native';
import SettingsScreen from '@/src/screens/SettingsScreen';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const AppNavigator = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={MainScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('<MainScreen />', () => {
  test('renders Sync Now button', async () => {
    render(<AppNavigator />);
    expect(screen.getByText('Sync Now')).toBeVisible();
    
  });
});
