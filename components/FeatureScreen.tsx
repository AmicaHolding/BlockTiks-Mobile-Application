import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from './ui/Text';
import { Screen } from './ui/Screen';
import { AppHeader } from './ui/AppHeader';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PressableCard } from './ui/Card';
import { useToast } from './ui/Toast';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { useState } from 'react';

interface Props {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  description?: string;
  placeholder?: string;
  inputLabel?: string;
  buttonTitle?: string;
  list?: string[];
  onAction?: () => void;
}

export function FeatureScreen({
  title,
  icon = 'construct-outline',
  description = 'Manage this part of your event experience.',
  placeholder,
  inputLabel,
  buttonTitle = 'Continue',
  list,
  onAction,
}: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handlePress = () => {
    if (placeholder && !value) {
      show(`Please enter a value`, 'error');
      return;
    }
    if (onAction) {
      onAction();
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show(`${title} saved`, 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title={title} showBack />

      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={40} color={Colors.primary} />
      </View>

      <Text variant="heading2" weight="bold" center style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color={Colors.textMuted} center style={styles.description}>
        {description}
      </Text>

      {inputLabel && (
        <Input
          label={inputLabel}
          placeholder={placeholder}
          value={value}
          onChangeText={setValue}
        />
      )}

      {list && (
        <View style={styles.list}>
          {list.map((item, idx) => (
            <PressableCard key={idx} variant="pressed" style={styles.listItem}>
              <Text variant="bodySmall" weight="medium">
                {item}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </PressableCard>
          ))}
        </View>
      )}

      <Button title={buttonTitle} loading={loading} onPress={handlePress} style={styles.button} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(182, 32, 224, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  description: {
    marginBottom: Spacing.xl,
    paddingHorizontal: 16,
  },
  list: {
    gap: 10,
    marginBottom: Spacing.xl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  button: {
    marginTop: 'auto',
  },
});
