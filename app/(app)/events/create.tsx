import { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text, Screen, AppHeader, Button, Input, Card, useToast } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENT_CATEGORIES } from '@/services/data';

export default function CreateEventScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(EVENT_CATEGORIES[0]);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !location || !date || !price) {
      show('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Event created successfully!', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title="Create Event" showBack />

      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {image ? (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera-outline" size={36} color={Colors.primary} />
            <Text variant="bodySmall" color={Colors.textMuted} style={{ marginTop: 8 }}>
              Add Event Cover
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Input
        label="Event Title"
        placeholder="e.g. Summer Music Festival"
        value={title}
        onChangeText={setTitle}
      />

      <Text variant="bodySmall" weight="medium" style={styles.label}>
        Category
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
      >
        {EVENT_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(cat)}
            style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
          >
            <Text
              variant="bodySmall"
              weight={category === cat ? 'bold' : 'regular'}
              color={category === cat ? Colors.black : Colors.text}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Input
        label="Date & Time"
        placeholder="e.g. Oct 25, 8:00 PM"
        value={date}
        onChangeText={setDate}
      />
      <Input
        label="Location"
        placeholder="e.g. Madison Square Garden, NY"
        value={location}
        onChangeText={setLocation}
      />
      <Input
        label="Base Ticket Price"
        placeholder="e.g. 85"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />
      <Input
        label="Description"
        placeholder="Describe your event..."
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
        style={styles.descriptionInput}
      />

      <Button title="Create Event" loading={loading} onPress={handleSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  imagePicker: {
    height: 180,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  label: {
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    marginBottom: Spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.round,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: Spacing.md,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
