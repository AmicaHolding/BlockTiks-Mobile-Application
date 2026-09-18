import { ReactNode } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  StyleSheet,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { StatusBar } from 'expo-status-bar';

interface Props {
  children: ReactNode;
  scrollable?: boolean;
  safe?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
}

export function Screen({
  children,
  scrollable = false,
  safe = true,
  style,
  contentStyle,
  keyboardAvoiding = true,
}: Props) {
  const Wrapper = safe ? SafeAreaView : View;
  const contentPadding = { paddingHorizontal: 16 };

  const innerContent = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentPadding, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentPadding, contentStyle]}>{children}</View>
  );

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      {innerContent}
    </KeyboardAvoidingView>
  ) : (
    innerContent
  );

  return (
    <Wrapper style={[styles.screen, style]}>
      <StatusBar style="light" />
      {body}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
});
