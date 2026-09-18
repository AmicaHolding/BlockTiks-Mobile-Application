import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, Button, IconButton } from '@/components/ui';
import { Colors } from '@/constants/Colors';

interface Props {
  title: string;
  subtitle?: string;
}

export function PlaceholderScreen({ title, subtitle = 'Coming soon in the Expo Go version.' }: Props) {
  return (
    <Screen>
      <IconButton name="arrow-back" onPress={() => router.back()} style={styles.back} />
      <View style={styles.center}>
        <Text variant="heading2" weight="bold" center>
          {title}
        </Text>
        <Text variant="body" color={Colors.textMuted} center style={styles.subtitle}>
          {subtitle}
        </Text>
        <Button title="Go Back" variant="outline" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    marginBottom: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
});
