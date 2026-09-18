import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Text, Screen, Button } from '@/components/ui';
import { Colors } from '@/constants/Colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Screen contentStyle={styles.container}>
        <Text variant="heading1" weight="bold" style={styles.title}>
          This screen doesn't exist.
        </Text>
        <Link href="/(app)" asChild>
          <Button title="Go to home" variant="outline" />
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
});
