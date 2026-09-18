import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, Button } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { haptic } from '@/services/haptics';

export default function MyScannerScreen() {
  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name="scan-outline" size={48} color={Colors.primaryBright} />
      </View>
      <Text variant="heading2" weight="bold" center style={styles.title}>
        Entry scanner
      </Text>
      <Text variant="body" color={Colors.textMuted} center style={styles.subtitle}>
        Scan guest QR codes for fast, fraud-free check-in. Works offline and syncs when you're back online.
      </Text>
      <Button
        title="Open scanner"
        onPress={() => {
          haptic.medium();
          router.push('/(app)/scanner');
        }}
      />
      <Button
        title="View guest list"
        variant="outline"
        onPress={() => router.push('/(app)/all-guests')}
        style={styles.secondary}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing.xxl,
    paddingHorizontal: 8,
  },
  secondary: {
    marginTop: Spacing.md,
  },
});
