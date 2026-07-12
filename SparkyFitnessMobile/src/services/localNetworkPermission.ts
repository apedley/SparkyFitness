import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLog } from './LogService';

const AUTO_REQUEST_FLAG_KEY = '@LocalNetwork:hasAutoRequested';

export type LocalNetworkPermissionRequestResult =
  | 'granted'
  | 'denied'
  | 'already-granted'
  | 'already-requested'
  | 'not-applicable';

/**
 * Android 16 (API 36) can gate sockets to LAN and VPN ranges (including the
 * Tailscale 100.64.0.0/10 range) behind a runtime permission when Local
 * Network Protections are enforced (#1767). Earlier Android versions tie
 * NEARBY_WIFI_DEVICES to Wi-Fi device discovery, not socket access, so
 * prompting there would be pure noise.
 */
export function isLocalNetworkPermissionRelevant(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) >= 36;
}

/**
 * NEARBY_WIFI_DEVICES is Android 16's interim gate for local-network access;
 * Android 17 (API 37) replaces it with the dedicated ACCESS_LOCAL_NETWORK
 * permission. Neither string is in RN's PermissionsAndroid constants yet.
 */
export function localNetworkPermissionName(): Permission {
  return (
    Number(Platform.Version) >= 37
      ? 'android.permission.ACCESS_LOCAL_NETWORK'
      : 'android.permission.NEARBY_WIFI_DEVICES'
  ) as Permission;
}

/**
 * Returns true when the permission is granted — or when it isn't applicable
 * (iOS, Android < 16), so callers don't need to branch on platform.
 */
export async function checkLocalNetworkPermission(): Promise<boolean> {
  if (!isLocalNetworkPermissionRelevant()) return true;

  try {
    return await PermissionsAndroid.check(localNetworkPermissionName());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`[LocalNetwork] Permission check failed: ${message}`, 'WARNING');
    // Fail open: a broken check shouldn't make surfaces nag about a
    // permission that may well be granted.
    return true;
  }
}

/**
 * Shows the system permission dialog at most once ever (persisted flag), and
 * only when the permission is relevant and not yet granted. Callers should
 * retry their connection only on 'granted', and derive hint visibility from
 * checkLocalNetworkPermission() — never from this function's non-granted
 * returns (which include 'already-granted').
 */
export async function maybeAutoRequestLocalNetworkPermission(): Promise<LocalNetworkPermissionRequestResult> {
  if (!isLocalNetworkPermissionRelevant()) return 'not-applicable';

  try {
    if (await PermissionsAndroid.check(localNetworkPermissionName())) {
      return 'already-granted';
    }

    const hasAutoRequested = await AsyncStorage.getItem(AUTO_REQUEST_FLAG_KEY);
    if (hasAutoRequested === 'true') {
      return 'already-requested';
    }
    await AsyncStorage.setItem(AUTO_REQUEST_FLAG_KEY, 'true');

    const status = await PermissionsAndroid.request(localNetworkPermissionName());
    addLog(`[LocalNetwork] Auto-requested local network permission: ${status}`, 'INFO');
    return status === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`[LocalNetwork] Permission request failed: ${message}`, 'WARNING');
    return 'denied';
  }
}
