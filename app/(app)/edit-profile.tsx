import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  Text,
  Screen,
  AppHeader,
  Input,
  Button,
  Avatar,
  PressableCard,
  useToast,
} from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';
import { USER_PROFILE } from '@/services/data';

export default function EditProfileScreen() {
  const [name, setName] = useState(USER_PROFILE.name);
  const [bio, setBio] = useState(USER_PROFILE.bio);
  const [website, setWebsite] = useState(USER_PROFILE.website);
  const [avatar, setAvatar] = useState<string | null>(USER_PROFILE.avatar);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Profile updated', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title="Edit Profile" showBack />

      <PressableCard variant="ghost" style={styles.avatarWrapper} onPress={pickImage}>
        <Avatar uri={avatar} name={name} size={120} />
        <Text variant="caption" color={Colors.primary} style={styles.changePhoto}>
          Change Photo
        </Text>
      </PressableCard>

      <Input label="Display Name" value={name} onChangeText={setName} />
      <Input label="Website" value={website} onChangeText={setWebsite} />
      <Input
        label="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
        style={styles.bioInput}
      />

      <Button title="Save Changes" loading={loading} onPress={handleSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  changePhoto: {
    marginTop: Spacing.md,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
