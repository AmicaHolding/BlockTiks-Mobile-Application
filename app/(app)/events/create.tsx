import { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text, Screen, Button, Input, IconButton, Card, useToast } from '@/components/ui';
import { Colors } from '@/constants/Colors';

const EVENT_CATEGORIES = ['Music', 'Sports', 'Theater', 'Comedy', 'Festivals', 'Conference'];

export default function CreateEventScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Music');
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
    // TODO: wire to API
    setTimeout(() => {
      setLoading(false);
      show('Event created successfully!', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => router.back()} />
        <Text variant="heading2" weight="bold">
          Create Event
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {image ? (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera-outline" size={32} color={Colors.primary} />
            <Text variant="bodySmall" color={Colors.textMuted}>
              Add Event Cover
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Card style={styles.formCard}>
        <Input
          label="Event Title"
          placeholder="e.g. Summer Music Festival"
          value={title}
          onChangeText={setTitle}
        />

        <Text variant="label" color={Colors.textMuted} style={styles.label}>
          Category
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {EVENT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
            >
              <Text
                variant="bodySmall"
                weight={category === cat ? 'semibold' : 'regular'}
                color={category === cat ? Colors.white : Colors.textMuted}
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
          label="Ticket Price"
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
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imagePicker: {
    height: 180,
    borderRadius: 16,
    backgroundColor: Colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  formCard: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 6,
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
