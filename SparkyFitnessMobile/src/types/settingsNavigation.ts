export type SettingsStackParamList = {
  SettingsIndex: undefined;
  ServerSettings: undefined;
  ServerEditSettings: { configId: string; prefillUrl?: string; prefillProxyHeaders?: import('../services/storage').ProxyHeader[] };
  HealthDataSettings: undefined;
  AppearanceSettings: undefined;
  LogsSettings: undefined;
  About: undefined;
  DevToolsSettings: undefined;
};
