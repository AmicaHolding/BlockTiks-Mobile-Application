import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Colors, Radius } from '@/constants/Colors';

interface Props {
  text: string;
  color?: string;
  textColor?: string;
}

export function Badge({ text, color = 'rgba(255,255,255,0.15)', textColor = Colors.text }: Props) {
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
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
});
