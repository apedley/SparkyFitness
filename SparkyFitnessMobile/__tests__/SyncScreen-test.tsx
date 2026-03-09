import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import SyncScreen from '@/src/screens/SyncScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createTestQueryClient } from './hooks/queryTestUtils';
import { useServerConnection } from '../src/hooks';

jest.mock('../src/hooks', () => ({
  ...jest.requireActual('../src/hooks'),
  useServerConnection: jest.fn(),
  useSyncHealthData: jest.fn(() => ({ isPending: false, mutate: jest.fn() })),
}));

jest.mock('../src/services/healthConnectService', () => ({
  initHealthConnect: jest.fn().mockResolvedValue(true),
  aggregateHeartRateByDate: jest.fn(),
  loadHealthPreference: jest.fn().mockResolvedValue(false),
  getSyncStartDate: jest.fn(),
  readHealthRecords: jest.fn(),
  getAggregatedStepsByDate: jest.fn(),
  getAggregatedActiveCaloriesByDate: jest.fn(),
  getAggregatedTotalCaloriesByDate: jest.fn(),
  getAggregatedDistanceByDate: jest.fn(),
  getAggregatedFloorsClimbedByDate: jest.fn(),
}));

jest.mock('../src/services/storage', () => ({
  saveTimeRange: jest.fn(),
  loadTimeRange: jest.fn().mockResolvedValue(null),
  loadLastSyncedTime: jest.fn().mockResolvedValue(null),
}));

const mockUseServerConnection = useServerConnection as jest.MockedFunction<typeof useServerConnection>;

const Stack = createStackNavigator();

const queryClient = createTestQueryClient();

const DummySettings = () => null;

const AppNavigator = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={SyncScreen as React.ComponentType} />
          <Stack.Screen name="Settings" component={DummySettings} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('<SyncScreen />', () => {
  afterEach(() => {
    queryClient.clear();
  });

  test('renders Sync Now button when connected', async () => {
    mockUseServerConnection.mockReturnValue({ isConnected: true, isLoading: false } as any);
    render(<AppNavigator />);
    expect(await screen.findByText('Sync Now')).toBeVisible();
    await waitFor(() => {});
  });

  test('renders no server message when disconnected', async () => {
    mockUseServerConnection.mockReturnValue({ isConnected: false, isLoading: false } as any);
    render(<AppNavigator />);
    expect(await screen.findByText('No server configured')).toBeVisible();
    expect(screen.getByText('Go to Server Settings')).toBeVisible();
    expect(screen.queryByText('Sync Now')).toBeNull();
    await waitFor(() => {});
  });
});
