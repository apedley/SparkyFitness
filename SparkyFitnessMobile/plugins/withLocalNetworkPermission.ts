import { ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

interface UsesPermissionEntry {
  $: Record<string, string>;
}

/**
 * Declares the Android local-network permissions with the attributes the
 * `android.permissions` string array in app.config.ts can't express
 * (`usesPermissionFlags`). Unknown permissions are ignored on older Android:
 * - NEARBY_WIFI_DEVICES gates Android 16's opt-in Local Network Protections.
 * - ACCESS_LOCAL_NETWORK is the dedicated permission Android 17 makes mandatory.
 */
const withLocalNetworkPermission: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] ?? [];
    const permissions = manifest['uses-permission'] as UsesPermissionEntry[];

    // Set attributes on an existing entry rather than skip: if a permission
    // also lands in the androidPermissions string array, Expo appends a
    // flagless duplicate and manifest ordering would decide which wins.
    const upsertPermission = (name: string, attributes: Record<string, string> = {}) => {
      const existing = permissions.find((entry) => entry.$?.['android:name'] === name);
      const entry = existing ?? { $: {} };
      entry.$ = { ...entry.$, 'android:name': name, ...attributes };
      if (!existing) {
        permissions.push(entry);
      }
    };

    upsertPermission('android.permission.NEARBY_WIFI_DEVICES', {
      'android:usesPermissionFlags': 'neverForLocation',
    });
    upsertPermission('android.permission.ACCESS_LOCAL_NETWORK');

    return config;
  });
};

export default withLocalNetworkPermission;
