import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEmergencySession } from '../hooks/useEmergencySession';
import { colors } from '../theme/colors';
import { EmergencyLocation } from '../types/location';

function formatCoords(location: EmergencyLocation): string {
  if (!location.available || location.latitude == null || location.longitude == null) {
    return 'unavailable';
  }
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

/**
 * Local simulated delivery toasts shown while AlertService notifies guardians.
 */
export function DeliveryBannerStack() {
  const { banners, dismissBanner } = useEmergencySession();

  if (banners.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.stack}>
      {banners.slice(-3).map((banner) => (
        <View key={banner.id} style={styles.banner}>
          <Text style={styles.eyebrow}>Sending emergency alert to</Text>
          <Text style={styles.name}>{banner.guardianName}</Text>
          <Text style={styles.phone}>{banner.phoneNumber}</Text>
          <Text style={styles.meta}>Location</Text>
          <Text style={styles.body}>{formatCoords(banner.location)}</Text>
          <Text style={styles.meta}>Status</Text>
          <Text style={styles.status}>
            {banner.status === 'delivered' ? 'Delivered (Simulated)' : banner.status}
          </Text>
          <Pressable
            onPress={() => dismissBanner(banner.id)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.dismiss}>Dismiss</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 56,
    gap: 10,
    zIndex: 50,
  },
  banner: {
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  eyebrow: {
    color: colors.alert,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    marginTop: 2,
  },
  phone: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  meta: {
    marginTop: 8,
    color: colors.inkDim,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  status: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  dismiss: {
    marginTop: 8,
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
