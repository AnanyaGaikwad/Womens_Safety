import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  level: number;
  db: number;
};

export function LevelMeter({ level, db }: Props) {
  const pct = Math.round(Math.max(0.04, Math.min(1, level)) * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.label}>
        {Number.isFinite(db) && db > -150 ? `${db.toFixed(0)} dB` : '— dB'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
  },
  track: {
    height: 4,
    width: '100%',
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  label: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
