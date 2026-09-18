import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Colors } from '@/constants/Colors';

interface Props {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <TouchableOpacity
      disabled={!onAction}
      onPress={onAction}
      style={styles.container}
      activeOpacity={onAction ? 0.7 : 1}
    >
      <Text variant="heading3" weight="bold">
        {title}
      </Text>
      {actionLabel && (
        <Text variant="bodySmall" weight="medium" color={Colors.primary}>
          {actionLabel}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});
