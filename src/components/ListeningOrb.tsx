import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { GuardStatus } from '../types/detection';

type Props = {
  level: number;
  status: GuardStatus;
};

export function ListeningOrb({ level, status }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const alertFlash = useRef(new Animated.Value(0)).current;
  const meter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    Animated.timing(meter, {
      toValue: Math.max(0.08, Math.min(1, level)),
      duration: 90,
      useNativeDriver: true,
    }).start();
  }, [level, meter]);

  useEffect(() => {
    if (status !== 'triggered') {
      alertFlash.setValue(0);
      return;
    }
    const flash = Animated.loop(
      Animated.sequence([
        Animated.timing(alertFlash, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(alertFlash, {
          toValue: 0.25,
          duration: 420,
          useNativeDriver: true,
        }),
      ])
    );
    flash.start();
    return () => flash.stop();
  }, [status, alertFlash]);

  const listening = status === 'listening' || status === 'triggered';
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, listening ? 1.08 : 1.02],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, listening ? 0.55 : 0.28],
  });
  const meterScale = meter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1.18],
  });

  const coreColor =
    status === 'triggered'
      ? colors.alert
      : status === 'listening'
        ? colors.brand
        : colors.brandSoft;

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ringOpacity,
            transform: [{ scale }],
            borderColor: status === 'triggered' ? colors.alert : colors.brand,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.meter,
          {
            backgroundColor: coreColor,
            transform: [{ scale: meterScale }],
            opacity: status === 'triggered' ? alertFlash : 1,
          },
        ]}
      />
      <View style={[styles.core, { backgroundColor: colors.bgElevated }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
  },
  meter: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  core: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
