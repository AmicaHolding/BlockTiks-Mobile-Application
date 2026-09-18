import { useState } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Text, Screen, AppHeader, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

const { width } = Dimensions.get('window');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const SALES_DATA = [1200, 2100, 1850, 3200, 2800, 4500];

export default function AnalyticsScreen() {
  const [filter] = useState('6M');

  return (
    <Screen>
      <AppHeader title="Analytics" showBack />

      <Card style={styles.chartCard}>
        <Text variant="heading3" weight="bold">
          Sales Overview
        </Text>
        <Text variant="bodySmall" color={Colors.textMuted} style={styles.filterLabel}>
          Last {filter}
        </Text>
        <LineChart
          data={{
            labels: MONTHS,
            datasets: [{ data: SALES_DATA }],
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
            Avg. Order
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            $142
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>
            Conversion
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            4.8%
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>
            Refund Rate
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            1.2%
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>
            New Followers
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            1.2k
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
  filterLabel: {
    marginTop: 4,
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    marginTop: 8,
  },
});
