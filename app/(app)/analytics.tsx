import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Text, Screen, AppHeader, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  return (
    <Screen>
      <AppHeader title="Analytics" showBack />

      <Card style={styles.chartCard}>
        <Text variant="heading3" weight="bold">
          Performance
        </Text>
        <LineChart
          data={{
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{ data: [1200, 2100, 1850, 3200, 2800, 4500] }],
          }}
          width={width - 64}
          height={220}
          chartConfig={{
            backgroundColor: Colors.surface,
            backgroundGradientFrom: Colors.surface,
            backgroundGradientTo: Colors.surface,
            decimalPlaces: 0,
            color: () => Colors.primary,
            labelColor: () => Colors.textMuted,
            style: { borderRadius: 12 },
            propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary },
          }}
          bezier
          style={styles.chart}
        />
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>
            Revenue
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            $9,820
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>
            Sales
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            348
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    marginBottom: Spacing.xl,
    paddingBottom: 8,
  },
  chart: {
    borderRadius: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    marginTop: 8,
  },
});
