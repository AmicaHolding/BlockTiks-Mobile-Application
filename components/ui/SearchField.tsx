import { View, TextInput, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/Colors';

interface Props {
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  readOnly?: boolean;
  showFilter?: boolean;
  onFilterPress?: () => void;
  containerStyle?: ViewStyle;
}

export function SearchField({
  value,
  placeholder = 'Search',
  onChangeText,
  onPress,
  readOnly = false,
  showFilter = false,
  onFilterPress,
  containerStyle,
}: Props) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name="search-outline" size={20} color={Colors.textMuted} style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        editable={!readOnly}
        pointerEvents={readOnly ? 'none' : 'auto'}
      />
      {showFilter && (
        <TouchableOpacity onPress={onFilterPress}>
          <Ionicons name="options-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      )}
      {readOnly && !showFilter && <View style={{ width: 8 }} />}
      {onPress && readOnly && (
        <TouchableOpacity onPress={onPress} activeOpacity={1} style={styles.overlay} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 10,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
