import { useEffect } from 'react';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { setOnSessionExpired, setOnNoConfigs, suppressSessionExpired } from '../services/api/authService';
import { clearServerConfigCache } from '../services/storage';
import type { RootStackParamList } from '../types/navigation';

export function useAuth(navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>) {
  useEffect(() => {
    setOnSessionExpired((configId) => {
      clearServerConfigCache();
      suppressSessionExpired(true);
      if (navigationRef.isReady()) {
        navigationRef.navigate('Tabs', {
          screen: 'Settings',
          params: {
            screen: 'ServerDetail',
            params: { configId },
          },
        });
      }
    });

    setOnNoConfigs(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Tabs', {
          screen: 'Settings',
          params: { screen: 'ServerSettings' },
        });
      }
    });
  }, [navigationRef]);

}
