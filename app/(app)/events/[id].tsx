import { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, IconButton, Badge, useToast } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS } from '@/services/data';

const { width } = Dimensions.get('window');

const GOING_FACES = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
  'https://images.unsplash.com/photo-1527980965255-d84b6e48f3e5?w=100&q=80',
];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = EVENTS.find((e) => e.id === id) || EVENTS[0];
  const { show } = useToast();

  const openDirections = () => {
    Linking.openURL(`https://maps.google.com/?q=${event.location}`);
  };

  return (
    <Screen safe={false} scrollable={false} noPadding>
      <View style={styles.imageContainer}>
        <Image source={{ uri: event.image }} style={styles.image} />
        <View style={styles.overlay} />
        <IconButton
          name="chevron-back"
          onPress={() => router.back()}
          style={styles.backButton}
          backgroundColor="rgba(0,0,0,0.3)"
        />
        <IconButton
          name="share-outline"
          onPress={() => show('Share coming soon', 'info')}
          style={styles.shareButton}
          backgroundColor="rgba(0,0,0,0.3)"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerRow}>
          <Badge text={event.category} color="rgba(255,255,255,0.15)" textColor={Colors.text} />
          <View style={styles.socialProof}>
            <View style={styles.faceStack}>
              {GOING_FACES.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={[styles.face, { marginLeft: idx > 0 ? -10 : 0 }]} />
              ))}
            </View>
            <Text variant="caption" color={Colors.textMuted}>
              +42 going
            </Text>
          </View>
        </View>

        <Text variant="heading1" weight="bold" style={styles.title}>
          {event.title}
        </Text>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar-outline" size={20} color={Colors.text} />
            </View>
            <View>
              <Text variant="body" weight="medium">
                {event.date}
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted}>
                {event.time}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={openDirections} style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="location-outline" size={20} color={Colors.text} />
            </View>
            <View style={styles.locationText}>
              <Text variant="body" weight="medium">
                {event.location}
              </Text>
              <Text variant="bodySmall" color={Colors.primaryBright}>
                Get directions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text variant="bodySmall" color={Colors.textMuted} style={styles.description}>
          {event.description}
        </Text>

        <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
          Lineup
        </Text>
        <View style={styles.lineup}>
          {['DJ MaksMellow', 'Orignawa', 'Special Guest'].map((artist) => (
            <View key={artist} style={styles.artistChip}>
              <Text variant="bodySmall" weight="medium">
                {artist}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text variant="caption" color={Colors.textMuted}>
            From
          </Text>
          <Text variant="heading2" weight="bold">
            ${event.price}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.getTicketsButton}
          onPress={() => router.push(`/(app)/events/${event.id}/tickets`)}
        >
          <Text variant="body" weight="semibold" color={Colors.ink}>
            Get tickets
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    height: 380,
  },
  image: {
    width,
    height: 380,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 16,
  },
  shareButton: {
    position: 'absolute',
    top: 56,
    right: 16,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faceStack: {
    flexDirection: 'row',
    marginRight: 8,
  },
  face: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  title: {
    marginBottom: Spacing.lg,
  },
  infoBlock: {
    gap: 14,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  locationText: {
    flex: 1,
    marginRight: 8,
  },
  description: {
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  lineup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  artistChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundElevated,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  getTicketsButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: Radius.full,
  },
});
