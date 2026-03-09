import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { setOnSessionExpired, setOnNoConfigs, suppressSessionExpired } from '../../src/services/api/authService';
import { clearServerConfigCache } from '../../src/services/storage';

jest.mock('../../src/services/api/authService', () => ({
  setOnSessionExpired: jest.fn(),
  setOnNoConfigs: jest.fn(),
  suppressSessionExpired: jest.fn(),
}));

jest.mock('../../src/services/storage', () => ({
  clearServerConfigCache: jest.fn(),
}));

const mockSetOnSessionExpired = setOnSessionExpired as jest.MockedFunction<typeof setOnSessionExpired>;
const mockSetOnNoConfigs = setOnNoConfigs as jest.MockedFunction<typeof setOnNoConfigs>;
const mockClearServerConfigCache = clearServerConfigCache as jest.MockedFunction<typeof clearServerConfigCache>;
const mockSuppressSessionExpired = suppressSessionExpired as jest.MockedFunction<typeof suppressSessionExpired>;

function createMockNavigationRef() {
  return {
    isReady: jest.fn().mockReturnValue(true),
    navigate: jest.fn(),
    current: null,
    getRootState: jest.fn(),
    dispatch: jest.fn(),
    canGoBack: jest.fn(),
    goBack: jest.fn(),
    resetRoot: jest.fn(),
    getParent: jest.fn(),
    getCurrentRoute: jest.fn(),
    getCurrentOptions: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    isFocused: jest.fn(),
    getId: jest.fn(),
    getState: jest.fn(),
  } as any;
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers callbacks on mount', async () => {
    const navRef = createMockNavigationRef();
    renderHook(() => useAuth(navRef));

    await act(async () => {});

    expect(mockSetOnSessionExpired).toHaveBeenCalledTimes(1);
    expect(mockSetOnSessionExpired).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSetOnNoConfigs).toHaveBeenCalledTimes(1);
    expect(mockSetOnNoConfigs).toHaveBeenCalledWith(expect.any(Function));
  });

  test('session expired callback navigates to ServerDetail', async () => {
    const navRef = createMockNavigationRef();

    renderHook(() => useAuth(navRef));
    await act(async () => {});

    const sessionExpiredCb = mockSetOnSessionExpired.mock.calls[0][0];
    act(() => {
      sessionExpiredCb('config-42');
    });

    expect(navRef.navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'Settings',
      params: {
        screen: 'ServerDetail',
        params: { configId: 'config-42' },
      },
    });
  });

  test('session expired clears config cache and suppresses session expired', async () => {
    const navRef = createMockNavigationRef();

    renderHook(() => useAuth(navRef));
    await act(async () => {});

    mockClearServerConfigCache.mockClear();

    const sessionExpiredCb = mockSetOnSessionExpired.mock.calls[0][0];
    act(() => {
      sessionExpiredCb('config-42');
    });

    expect(mockClearServerConfigCache).toHaveBeenCalledTimes(1);
    expect(mockSuppressSessionExpired).toHaveBeenCalledWith(true);
  });

  test('no-configs callback navigates to ServerSettings', async () => {
    const navRef = createMockNavigationRef();

    renderHook(() => useAuth(navRef));
    await act(async () => {});

    const noConfigsCb = mockSetOnNoConfigs.mock.calls[0][0];
    act(() => {
      noConfigsCb();
    });

    expect(navRef.navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'Settings',
      params: { screen: 'ServerSettings' },
    });
  });

  test('does not navigate when navigationRef is not ready', async () => {
    const navRef = createMockNavigationRef();
    navRef.isReady.mockReturnValue(false);

    renderHook(() => useAuth(navRef));
    await act(async () => {});

    const sessionExpiredCb = mockSetOnSessionExpired.mock.calls[0][0];
    act(() => {
      sessionExpiredCb('config-42');
    });

    expect(navRef.navigate).not.toHaveBeenCalled();
  });
});
