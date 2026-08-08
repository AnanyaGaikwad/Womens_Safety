export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unavailable';

export type EmergencyLocation = {
  latitude: number | null;
  longitude: number | null;
  timestamp: number;
  permissionStatus: LocationPermissionStatus;
  available: boolean;
};

export function unavailableLocation(
  permissionStatus: LocationPermissionStatus = 'unavailable'
): EmergencyLocation {
  return {
    latitude: null,
    longitude: null,
    timestamp: Date.now(),
    permissionStatus,
    available: false,
  };
}
