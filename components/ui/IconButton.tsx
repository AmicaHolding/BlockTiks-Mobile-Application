import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/Colors';

interface Props {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  onPress?: () => void;
  style?: ViewStyle;
  backgroundColor?: string;
}

export function IconButton({
  name,
  size = 24,
  color = Colors.text,
  onPress,
  style,
  backgroundColor = 'transparent',
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.button, { backgroundColor }, style]}
    >
      <Ionicons name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
