import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePreferences, preferencesQueryKey } from '../../src/hooks/usePreferences';
import { fetchPreferences } from '../../src/services/preferencesApi';

jest.mock('../../src/services/preferencesApi', () => ({
  fetchPreferences: jest.fn(),
}));

const mockFetchPreferences = fetchPreferences as jest.MockedFunction<typeof fetchPreferences>;

describe('usePreferences', () => {
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
    test('fetches preferences on mount', async () => {
      mockFetchPreferences.mockResolvedValue({
        weight_unit: 'kg',
      });

      renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetchPreferences).toHaveBeenCalled();
      });
    });

    test('returns preferences data', async () => {
      const preferencesData = {
        bmr_algorithm: 'mifflin_st_jeor',
        weight_unit: 'kg' as const,
        distance_unit: 'km' as const,
        energy_unit: 'kcal' as const,
        include_bmr_in_net_calories: true,
      };
      mockFetchPreferences.mockResolvedValue(preferencesData);

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences).toEqual(preferencesData);
    });

    test('isLoading becomes false after fetch completes', async () => {
      mockFetchPreferences.mockResolvedValue({
        weight_unit: 'kg',
      });

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('isError is true on fetch failure', async () => {
      mockFetchPreferences.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('refetch', () => {
    test('provides refetch function', async () => {
      mockFetchPreferences.mockResolvedValue({
        weight_unit: 'kg',
      });

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    test('refetch updates data', async () => {
      mockFetchPreferences.mockResolvedValue({
        weight_unit: 'kg',
      });

      const { result } = renderHook(() => usePreferences(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.preferences?.weight_unit).toBe('kg');
      });

      mockFetchPreferences.mockResolvedValue({
        weight_unit: 'lbs',
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.preferences?.weight_unit).toBe('lbs');
      });
    });
  });

  describe('query key', () => {
    test('exports correct query key', () => {
      expect(preferencesQueryKey).toEqual(['userPreferences']);
    });
  });
});
