import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Animated, StyleSheet, Dimensions } from 'react-native';
import { Text } from './Text';
import { Colors } from '@/constants/Colors';

interface ToastMessage {
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContextType {
  show: (message: string, type?: ToastMessage['type']) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextType>({
  show: () => {},
  hide: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible] = useState(new Animated.Value(0));
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const hide = useCallback(() => {
    Animated.timing(visible, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [visible]);

  const show = useCallback(
    (message: string, type: ToastMessage['type'] = 'info') => {
      setToast({ message, type });
      Animated.timing(visible, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setTimeout(hide, 2500);
    },
    [hide, visible]
  );

  const backgroundColor =
    toast?.type === 'error'
      ? Colors.error
      : toast?.type === 'success'
      ? Colors.success
      : Colors.surface;

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            { backgroundColor, opacity: visible },
            { transform: [{ translateY: visible.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }] },
          ]}
          pointerEvents="none"
        >
          <Text variant="bodySmall" weight="medium" color={Colors.white}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    width: width - 32,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
