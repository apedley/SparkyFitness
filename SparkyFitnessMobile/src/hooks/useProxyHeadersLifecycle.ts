import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { proxyHeadersToRecord } from '../services/storage';
import type { ProxyHeader } from '../services/storage';
import { setPendingProxyHeaders, clearPendingProxyHeaders } from '../services/api/authService';

/**
 * Manages the pending proxy headers lifecycle for auth screens.
 *
 * Sets pending proxy headers on the auth service when the screen gains focus
 * (so login/MFA API calls include them), and clears them when the screen
 * loses focus or unmounts.
 *
 * Reacts to changes in `proxyHeaders` — if headers are updated while the
 * screen is focused (e.g. user edits them on AddServerScreen), the service
 * state is updated immediately.
 */
export function useProxyHeadersLifecycle(proxyHeaders: ProxyHeader[] | undefined): void {
  useFocusEffect(
    useCallback(() => {
      if (proxyHeaders?.length) {
        setPendingProxyHeaders(proxyHeadersToRecord(proxyHeaders));
      }

      return () => {
        clearPendingProxyHeaders();
      };
    }, [proxyHeaders])
  );
}
