import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';

class MyScannerController extends GetxController {
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');
  QRViewController? controller;
  String? qrCodeResult;

  @override
  void dispose() {
    controller?.dispose();
    super.dispose();
  }
}
