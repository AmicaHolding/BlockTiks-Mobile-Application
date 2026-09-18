import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Colors, Radius } from '@/constants/Colors';

interface Props {
  text: string;
  color?: string;
  textColor?: string;
}

export function Badge({ text, color = Colors.primaryFaded, textColor = Colors.primaryLight }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text variant="caption" weight="semibold" color={textColor}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.round,
    alignSelf: 'flex-start',
  },
});
