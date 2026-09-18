import { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Text, Screen, Button, IconButton, useToast } from '@/components/ui';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');
const CUTOUT = 260;

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    show(`Ticket scanned: ${result.data}`, 'success');
    setTimeout(() => router.back(), 1200);
  };

  if (!permission?.granted) {
    return (
      <Screen contentStyle={styles.center}>
        <Text variant="heading3" weight="bold" center>
          Camera Permission Required
        </Text>
        <Text variant="body" color={Colors.textMuted} center style={styles.permissionText}>
          We need access to your camera to scan ticket QR codes.
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
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
            Scan Ticket
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.cutoutContainer}>
          <View style={styles.cutout} />
        </View>

        <Text variant="body" color={Colors.white} center style={styles.hint}>
          Position the QR code within the frame
        </Text>

        {scanned && (
          <Button
            title="Scan Again"
            onPress={() => setScanned(false)}
            style={styles.scanAgain}
          />
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
    paddingHorizontal: 32,
  },
  permissionText: {
    marginTop: 8,
    marginBottom: 24,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    marginBottom: 32,
  },
  cutoutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cutout: {
    width: CUTOUT,
    height: CUTOUT,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  hint: {
    marginBottom: 48,
  },
  scanAgain: {
    marginBottom: 32,
  },
});
