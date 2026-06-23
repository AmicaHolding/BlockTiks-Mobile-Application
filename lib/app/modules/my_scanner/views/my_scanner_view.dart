import 'package:block_tix/app/data/core/app_export.dart';
import 'package:flutter/material.dart';

import 'package:qr_code_scanner/qr_code_scanner.dart';
import 'package:get/get.dart';

import '../controllers/my_scanner_controller.dart';

class MyScannerView extends StatefulWidget {
  const MyScannerView({Key? key}) : super(key: key);

  @override
  _QRScannerPageState createState() => _QRScannerPageState();
}

class _QRScannerPageState extends State<MyScannerView> {

  final controller = Get.put(MyScannerController());



  @override
  void reassemble() {
    super.reassemble();
    if (controller.controller != null) {
      if (Theme.of(context).platform == TargetPlatform.android) {
        controller.controller!.pauseCamera();
      }
      controller.controller!.resumeCamera();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [

          Column(
            children: <Widget>[
              Expanded(
                flex: 4,
                child: QRView(
                  key: controller.qrKey,
                  onQRViewCreated: _onQRViewCreated,
                  overlay: QrScannerOverlayShape(
                    borderColor: Colors.red,
                    borderRadius: 10,
                    borderLength: 30,
                    borderWidth: 10,
                    cutOutSize: 300,
                  ),
                ),
              ),
            ],
          ),
          Positioned(
            top: 42,
            left: 0,
            child: Padding(
              padding: getPadding(left: 16,right: 16,top: 8,bottom: 8),
              child: GestureDetector(
                onTap:() {
                  Get.back();
                },
                child: Container(
                  height:getSize(30),
                  width:getSize(30),
                  decoration: BoxDecoration(
                      color: ColorConstant.whiteA700.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8)
                  ),
                  alignment: Alignment.center,
                  child: Padding(
                    padding: getPadding(left: 8),
                    child: Icon(Icons.arrow_back_ios,
                      color: ColorConstant.whiteA700,
                      size: 18,
                    ),
                  ),
                ),
              ),
            ),

          ),
        ],
      ),
    );
  }

  void _onQRViewCreated(QRViewController controller1) {
    controller.controller = controller1;
    controller.controller!.scannedDataStream.listen((scanData) {
      setState(() {
        controller.qrCodeResult = scanData.code;
      });
      Get.back();
    });
  }

}



