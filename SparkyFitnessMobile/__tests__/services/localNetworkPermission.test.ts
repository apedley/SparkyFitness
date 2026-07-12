import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isLocalNetworkPermissionRelevant,
  localNetworkPermissionName,
  checkLocalNetworkPermission,
  maybeAutoRequestLocalNetworkPermission,
} from '../../src/services/localNetworkPermission';

jest.mock('../../src/services/LogService', () => ({
  addLog: jest.fn(),
}));

const setPlatform = (os: 'ios' | 'android', version: number) => {
  Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });
  Object.defineProperty(Platform, 'Version', { get: () => version, configurable: true });
};

describe('localNetworkPermission', () => {
  let mockCheck: jest.SpyInstance;
  let mockRequest: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    // Mock at the PermissionsAndroid level: the underlying native methods hit
    // an invariant for the missing native module in the test environment.
    mockCheck = jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    mockRequest = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted');
    setPlatform('android', 36);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('platform gating', () => {
    test('not relevant on iOS; check reports granted without touching the native API', async () => {
      setPlatform('ios', 18);

      expect(isLocalNetworkPermissionRelevant()).toBe(false);
      await expect(checkLocalNetworkPermission()).resolves.toBe(true);
      await expect(maybeAutoRequestLocalNetworkPermission()).resolves.toBe('not-applicable');
      expect(mockCheck).not.toHaveBeenCalled();
      expect(mockRequest).not.toHaveBeenCalled();
    });

    test('not relevant on Android below API 36', async () => {
      setPlatform('android', 35);

      expect(isLocalNetworkPermissionRelevant()).toBe(false);
      await expect(checkLocalNetworkPermission()).resolves.toBe(true);
      await expect(maybeAutoRequestLocalNetworkPermission()).resolves.toBe('not-applicable');
      expect(mockCheck).not.toHaveBeenCalled();
      expect(mockRequest).not.toHaveBeenCalled();
    });

    test('relevant on Android 16 (API 36)', () => {
      expect(isLocalNetworkPermissionRelevant()).toBe(true);
    });
  });

  describe('localNetworkPermissionName', () => {
    test('uses NEARBY_WIFI_DEVICES on API 36', () => {
      expect(localNetworkPermissionName()).toBe('android.permission.NEARBY_WIFI_DEVICES');
    });

    test('uses ACCESS_LOCAL_NETWORK on API 37+', () => {
      setPlatform('android', 37);
      expect(localNetworkPermissionName()).toBe('android.permission.ACCESS_LOCAL_NETWORK');
    });
  });

  describe('checkLocalNetworkPermission', () => {
    test('returns the native check result on Android 16', async () => {
      mockCheck.mockResolvedValue(true);
      await expect(checkLocalNetworkPermission()).resolves.toBe(true);
      expect(mockCheck).toHaveBeenCalledWith('android.permission.NEARBY_WIFI_DEVICES');

      mockCheck.mockResolvedValue(false);
      await expect(checkLocalNetworkPermission()).resolves.toBe(false);
    });

    test('fails open when the native check throws', async () => {
      mockCheck.mockRejectedValue(new Error('native module missing'));
      await expect(checkLocalNetworkPermission()).resolves.toBe(true);
    });
  });

  describe('maybeAutoRequestLocalNetworkPermission', () => {
    test('requests once and returns granted', async () => {
      mockRequest.mockResolvedValue('granted');

      await expect(maybeAutoRequestLocalNetworkPermission()).resolves.toBe('granted');
      expect(mockRequest).toHaveBeenCalledWith('android.permission.NEARBY_WIFI_DEVICES');
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    test('returns denied when the user rejects the dialog', async () => {
      mockRequest.mockResolvedValue('denied');

      await expect(maybeAutoRequestLocalNetworkPermission()).resolves.toBe('denied');
    });

    test('returns already-granted without prompting when permission is held', async () => {
      mockCheck.mockResolvedValue(true);

      await expect(maybeAutoRequestLocalNetworkPermission()).resolves.toBe('already-granted');
      expect(mockRequest).not.toHaveBeenCalled();
    });

    test('prompts at most once ever — the flag persists across calls', async () => {
      mockRequest.mockResolvedValue('denied');

      await expect(maybeAutoRequestLocalNetworkPermission()).resolves.toBe('denied');
      await expect(maybeAutoRequestLocalNetworkPermission()).resolves.toBe('already-requested');
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    test('persists the flag even when the request itself is denied, so a later grant via Settings still short-circuits', async () => {
      mockRequest.mockResolvedValue('denied');
      await maybeAutoRequestLocalNetworkPermission();

      mockCheck.mockResolvedValue(true);
      await expect(maybeAutoRequestLocalNetworkPermission()).resolves.toBe('already-granted');
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });
  });
});
