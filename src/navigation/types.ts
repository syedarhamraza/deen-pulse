export type RootStackParamList = {
  onboarding: undefined;
  dashboard: undefined;
  settings: undefined;
  prayer_rules: undefined;
  notifications: undefined;
  data_management: undefined;
  about: undefined;
  oem_guidance: undefined;
  wearos_control: undefined;
  cat1_notification_guide: undefined;
  developer_options: undefined;
};

export type Screen = keyof RootStackParamList;
