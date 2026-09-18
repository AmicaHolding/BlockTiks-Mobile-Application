import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { Text } from './Text';
import { Badge } from './Badge';
import { PressableCard } from './Card';
import { Colors, Radius, Spacing } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface Props {
  image: string;
  title: string;
  type: string;
  price: string;
  date?: string;
  width?: number;
  onPress?: () => void;
  showDate?: boolean;
}

export function EventCard({
  image,
  title,
  type,
  price,
  date,
  width: cardWidth = 150,
  onPress,
  showDate = false,
}: Props) {
  return (
    <PressableCard
      variant="ghost"
      style={[styles.card, { width: cardWidth }]}
      onPress={onPress}
    >
      <View style={[styles.imageContainer, { width: cardWidth, height: cardWidth * 1.25 }]}>
        <Image source={{ uri: image }} style={styles.image} />
        {showDate && date && (
          <View style={styles.dateBadge}>
            <Text variant="bodySmall" weight="bold" color={Colors.white}>
              {date}
            </Text>
          </View>
        )}
        <View style={styles.gradient} />
        <View style={styles.info}>
          <Text variant="bodySmall" weight="bold" color={Colors.white}>
            {price}
          </Text>
          <Text variant="caption" color={Colors.textMuted}>
            {type}
          </Text>
          <Text variant="bodySmall" weight="bold" color={Colors.white} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: Spacing.md,
    padding: 0,
  },
  imageContainer: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  dateBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 1,
  },
});
