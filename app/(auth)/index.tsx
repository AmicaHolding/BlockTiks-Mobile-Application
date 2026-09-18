import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, Button } from '@/components/ui';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

export default function GetStartedScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80' }}
        style={styles.background}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.logoBox}>
          <Text variant="heading1" weight="bold" color={Colors.primary} center>
            BlockTiks
          </Text>
        </View>

        <Text variant="heading2" weight="bold" center style={styles.headline}>
          Book premium event tickets here
        </Text>
        <Text variant="body" color={Colors.textMuted} center style={styles.subtitle}>
          Discover, buy, and resell tickets for the hottest concerts, sports, and shows.
        </Text>

        <View style={styles.buttonGroup}>
          <Button title="Log In" onPress={() => router.push('/(auth)/sign-in')} />
          <Button
            title="Create an account"
            variant="outline"
            onPress={() => router.push('/(auth)/sign-up')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  background: {
    position: 'absolute',
    width,
    height,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 56,
  },
  logoBox: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  headline: {
    marginBottom: 12,
  },
  subtitle: {
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  buttonGroup: {
    gap: 16,
  },
});
