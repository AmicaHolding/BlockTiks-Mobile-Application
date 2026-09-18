import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Text, Button, Screen } from '@/components/ui';
import { Colors } from '@/constants/Colors';

export default function GetStartedScreen() {
  return (
    <Screen scrollable={false} contentStyle={styles.container}>
      <View style={styles.top}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text variant="heading1" weight="bold" center>
          BlockTiks
        </Text>
        <Text variant="body" color={Colors.textMuted} center style={styles.tagline}>
          Discover events, buy tickets, and manage your experiences all in one place.
        </Text>
      </View>

      <View style={styles.bottom}>
        <Button title="Get Started" onPress={() => router.push('/(auth)/sign-up')} />
        <Button
          title="I already have an account"
          variant="ghost"
          onPress={() => router.push('/(auth)/sign-in')}
          style={styles.secondaryButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 48,
  },
  top: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
  },
  tagline: {
    marginTop: 12,
    paddingHorizontal: 24,
  },
  bottom: {
    width: '100%',
  },
  secondaryButton: {
    marginTop: 8,
  },
});
