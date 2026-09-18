import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Text, Button, IconButton, useToast } from '@/components/ui';
import { Colors, Radius } from '@/constants/Colors';
import { haptic } from '@/services/haptics';

const { width } = Dimensions.get('window');
const CUTOUT = 260;

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const { show } = useToast();

  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(lineAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [lineAnim]);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    haptic.success();
    show(`Ticket verified: ${result.data.slice(0, 20)}...`, 'success');
    setTimeout(() => router.back(), 1500);
  };

  const translateY = lineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, CUTOUT - 2] });

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text variant="heading2" weight="bold" center>
          Camera access needed
        </Text>
        <Text variant="body" color={Colors.textMuted} center style={styles.permissionText}>
          We use your camera to scan ticket QR codes at the door.
        </Text>
        <Button title="Grant access" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.header}>
          <IconButton
            name="close-outline"
            onPress={() => router.back()}
            backgroundColor="rgba(0,0,0,0.4)"
          />
          <Text variant="heading3" weight="bold">
            Scan ticket
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.cutoutContainer}>
          <View style={[styles.cutout, scanned && styles.cutoutSuccess]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
          </View>
        </View>

        <Text variant="body" color={Colors.textMuted} center style={styles.hint}>
          Position the QR code in the frame
        </Text>

        {scanned && (
          <View style={styles.successBox}>
            <Text variant="heading3" weight="bold" color={Colors.success} center>
              Valid ticket
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: Colors.background,
  },
  permissionText: {
    marginTop: 8,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    marginBottom: 48,
  },
  cutoutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cutout: {
    width: CUTOUT,
    height: CUTOUT,
    borderRadius: Radius.lg,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  cutoutSuccess: {
    borderWidth: 2,
    borderColor: Colors.success,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.white,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: Radius.lg,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: Radius.lg,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: Radius.lg,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: Radius.lg,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primaryBright,
    shadowColor: Colors.primaryBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  hint: {
    marginBottom: 48,
  },
  successBox: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    right: 24,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.lg,
    padding: 20,
    alignItems: 'center',
  },
});
