import { useState } from 'react';
import { View, StyleSheet, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, PressableCard } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

const FAQS = [
  {
    q: 'How do I buy tickets?',
    a: 'Browse events, select the tickets you want, and complete checkout using your preferred payment method.',
  },
  {
    q: 'Can I resell my tickets?',
    a: 'Yes. Go to the Resell tab to list your tickets on the marketplace or place an ask.',
  },
  {
    q: 'How do I become a creator?',
    a: 'Switch to creator mode in settings to access tools for publishing and managing events.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'We never store card details on the device. Payment processing is handled by secure, PCI-compliant providers.',
  },
  {
    q: 'How do refunds work?',
    a: 'Refund eligibility depends on the event organizer\'s policy. Contact support for assistance.',
  },
];

export default function FaqsScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Screen>
      <AppHeader title="Help & FAQs" showBack />

      {FAQS.map((faq, idx) => (
        <PressableCard
          key={idx}
          variant="pressed"
          style={styles.item}
          onPress={() => toggle(idx)}
        >
          <View style={styles.questionRow}>
            <Text variant="bodySmall" weight="medium" style={styles.question}>
              {faq.q}
            </Text>
            <Ionicons
              name={openIndex === idx ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </View>
          {openIndex === idx && (
            <Text variant="bodySmall" color={Colors.textMuted} style={styles.answer}>
              {faq.a}
            </Text>
          )}
        </PressableCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    marginBottom: 10,
    paddingVertical: 14,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    flex: 1,
    marginRight: 8,
  },
  answer: {
    marginTop: Spacing.md,
    lineHeight: 22,
  },
});
