import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { Colors } from '@/constants/Colors';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'file-tray-outline', title, subtitle, actionTitle, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={Colors.textMuted} />
      <Text variant="heading3" weight="bold" center style={styles.title}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="body" color={Colors.textMuted} center style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
      {actionTitle && onAction && (
        <Button title={actionTitle} variant="outline" onPress={onAction} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 260,
  },
  title: {
    marginTop: 16,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    minWidth: 160,
  },
});
