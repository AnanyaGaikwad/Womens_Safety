export type RootTabParamList = {
  SoundGuard: undefined;
  Guardians: undefined;
  Profile: undefined;
};

export type GuardianAlertParams = {
  alertId: string;
  ownerUid: string;
  ownerDisplayName: string;
  reason: string;
  timestamp: string;
  latitude: string | null;
  longitude: string | null;
  note: string;
};

export type RootStackParamList = {
  MainTabs: undefined;
  EmergencyAlert: undefined;
  AlertHistory: undefined;
  MyQrCode: undefined;
  PairGuardian: undefined;
  GuardianAlert: GuardianAlertParams;
};
