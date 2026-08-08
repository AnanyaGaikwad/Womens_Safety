import * as Location from 'expo-location';
import {
  EmergencyLocation,
  LocationPermissionStatus,
  unavailableLocation,
} from '../types/location';

function mapPermission(
  status: Location.PermissionStatus
): LocationPermissionStatus {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return 'granted';
    case Location.PermissionStatus.DENIED:
      return 'denied';
    case Location.PermissionStatus.UNDETERMINED:
      return 'undetermined';
    default:
      return 'unavailable';
  }
}

/**
 * Foreground GPS lookup for emergency alerts.
 * Continues without coordinates when permission is denied or location fails.
 */
export const LocationService = {
  async getCurrentEmergencyLocation(): Promise<EmergencyLocation> {
    try {
      const current = await Location.getForegroundPermissionsAsync();
      let permission = mapPermission(current.status);

      if (permission !== 'granted') {
        const requested = await Location.requestForegroundPermissionsAsync();
        permission = mapPermission(requested.status);
      }

      if (permission !== 'granted') {
        return unavailableLocation(permission);
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: position.timestamp || Date.now(),
        permissionStatus: 'granted',
        available: true,
      };
    } catch {
      return unavailableLocation('unavailable');
    }
  },
};

export async function getCurrentEmergencyLocation(): Promise<EmergencyLocation> {
  return LocationService.getCurrentEmergencyLocation();
}
