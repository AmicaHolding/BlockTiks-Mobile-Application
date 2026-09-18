import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, AppHeader, Input, Button, useToast } from '@/components/ui';
import { Colors } from '@/constants/Colors';

export default function SendTicketsScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handleSend = () => {
    if (!email) {
      show('Please enter a recipient email', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Ticket sent successfully', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title="Send Tickets" showBack />

      <Text variant="body" color={Colors.textMuted} style={styles.description}>
        Transfer a ticket to a friend. They will receive an email with their digital ticket.
      </Text>

      <Input
        label="Recipient Email"
        placeholder="friend@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Input label="Message (optional)" placeholder="Add a note..." multiline numberOfLines={3} />

      <Button title="Send Ticket" loading={loading} onPress={handleSend} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: {
    marginBottom: 24,
  },
});
