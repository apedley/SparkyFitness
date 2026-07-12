import { View, Text, Linking } from 'react-native';

import Button from './ui/Button';

/**
 * Inline notice for connection failures that may be caused by Android's
 * local-network permission (LAN or VPN servers, #1767). Callers own the
 * relevance check — render this only when the permission is applicable
 * (Android 16+) and not granted.
 */
export default function LocalNetworkPermissionHint({ className = '' }: { className?: string }) {
  return (
    <View className={`p-3 rounded-lg bg-raised ${className}`}>
      <Text className="text-sm text-text-secondary">
        Server on a home network or VPN? Android may require the Nearby devices
        permission to reach it.
      </Text>
      <Button
        variant="ghost"
        onPress={() => Linking.openSettings()}
        className="self-start py-1.5 px-0 mt-1"
        textClassName="text-sm"
      >
        Open Android settings
      </Button>
    </View>
  );
}
