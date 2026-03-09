import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllServerConfigs,
  getActiveServerConfig,
} from '../services/storage';
import type { ServerConfig } from '../services/storage';

/**
 * Loads a single server config by ID on screen focus.
 * Returns the config, whether it's active, and a reload function.
 */
export function useServerConfig(configId: string) {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [isActive, setIsActive] = useState(false);

  const reload = useCallback(async () => {
    const configs = await getAllServerConfigs();
    const found = configs.find(c => c.id === configId) ?? null;
    setConfig(found);

    const active = await getActiveServerConfig();
    setIsActive(active?.id === configId);
  }, [configId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { config, isActive, reload };
}

/**
 * Loads all server configs and the active config ID on screen focus.
 */
export function useServerConfigs() {
  const [configs, setConfigs] = useState<ServerConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const allConfigs = await getAllServerConfigs();
    setConfigs(allConfigs);

    const activeConfig = await getActiveServerConfig();
    setActiveConfigId(activeConfig?.id ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { configs, activeConfigId, reload };
}
