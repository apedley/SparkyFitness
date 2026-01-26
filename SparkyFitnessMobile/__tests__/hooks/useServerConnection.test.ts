import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useServerConnection, serverConnectionQueryKey } from '../../src/hooks/useServerConnection';
import { checkServerConnection } from '../../src/services/healthDataApi';

jest.mock('../../src/services/healthDataApi', () => ({
  checkServerConnection: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    // Execute callback immediately for testing
    callback();
  }),
}));

const mockCheckServerConnection = checkServerConnection as jest.MockedFunction<
  typeof checkServerConnection
>;

describe('useServerConnection', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('query behavior', () => {
    test('returns false when server is not connected', async () => {
      mockCheckServerConnection.mockResolvedValue(false);

      const { result } = renderHook(() => useServerConnection(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isConnected).toBe(false);
    });

    test('returns true when server is connected', async () => {
      mockCheckServerConnection.mockResolvedValue(true);

      const { result } = renderHook(() => useServerConnection(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isConnected).toBe(true);
    });

    test('calls checkServerConnection on mount', async () => {
      mockCheckServerConnection.mockResolvedValue(true);

      renderHook(() => useServerConnection(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockCheckServerConnection).toHaveBeenCalled();
      });
    });

    test('isLoading becomes false after fetch completes', async () => {
      mockCheckServerConnection.mockResolvedValue(true);

      const { result } = renderHook(() => useServerConnection(), {
        wrapper: createWrapper(),
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('options', () => {
    test('accepts enablePolling option without error', async () => {
      mockCheckServerConnection.mockResolvedValue(true);

      const { result } = renderHook(() => useServerConnection({ enablePolling: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    test('works without options', async () => {
      mockCheckServerConnection.mockResolvedValue(true);

      const { result } = renderHook(() => useServerConnection(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });

  describe('refetch', () => {
    test('provides refetch function', async () => {
      mockCheckServerConnection.mockResolvedValue(true);

      const { result } = renderHook(() => useServerConnection(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    test('refetch updates data', async () => {
      mockCheckServerConnection.mockResolvedValue(false);

      const { result } = renderHook(() => useServerConnection(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      mockCheckServerConnection.mockResolvedValue(true);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });

  describe('query key', () => {
    test('exports correct query key', () => {
      expect(serverConnectionQueryKey).toEqual(['serverConnection']);
    });
  });
});
