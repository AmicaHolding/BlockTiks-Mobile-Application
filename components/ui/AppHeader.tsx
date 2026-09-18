import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { Colors, Spacing } from '@/constants/Colors';

interface Props {
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  showNotification?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
}

export function AppHeader({
  title,
  showBack = false,
  showLogo = false,
  showNotification = false,
  onBackPress,
  rightElement,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.side}>
        {showBack && (
          <IconButton
            name="chevron-back"
            onPress={onBackPress || (() => router.back())}
            color={Colors.text}
          />
        )}
      </View>

      <View style={styles.center}>
        {showLogo && (
          <Text variant="heading3" weight="bold" color={Colors.primary}>
            BlockTiks
          </Text>
        )}
        {title && !showLogo && (
          <Text variant="heading3" weight="bold" center>
            {title}
          </Text>
        )}
      </View>

      <View style={[styles.side, styles.right]}>
        {showNotification && (
          <IconButton
            name="notifications-outline"
            onPress={() => router.push('/(app)/notifications')}
            color={Colors.text}
          />
        )}
        {rightElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
  },
  right: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
});
