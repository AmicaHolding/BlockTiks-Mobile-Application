import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Colors } from '@/constants/Colors';

interface Props {
  text: string;
  color?: string;
}

export function Badge({ text, color = Colors.primary }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text variant="caption" weight="semibold" color={Colors.white}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
});
