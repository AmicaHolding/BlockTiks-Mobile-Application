import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

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
  bool _checkingIn = false;

  @override
  void initState() {
    super.initState();
    final args = Get.arguments;
    if (args is Map && args['eventId'] != null) {
      controller.eventId = args['eventId'].toString();
      controller.eventTitle = args['title']?.toString() ?? '';
    }
    controller.loadEventsIfNeeded();
  }

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

  Future<void> _onScanned(String code) async {
    if (_checkingIn ||
        controller.eventId.isEmpty ||
        controller.lastResult.value != null) {
      return;
    }
    _checkingIn = true;
    controller.lastResult.value = null;
    try {
      final res = await ApiService.checkInTicket(controller.eventId, code);
      controller.lastResult.value = res;
      if (res['result'] == 'OK') controller.noteCheckedIn();
    } catch (e) {
      controller.lastResult.value = {'result': 'ERROR', 'message': e.toString()};
    } finally {
      _checkingIn = false;
    }
  }

  void _resume() {
    controller.lastResult.value = null;
    controller.controller?.resumeCamera();
  }

  @override
  Widget build(BuildContext context) {
    final result = controller.lastResult.value;
    return Scaffold(
      backgroundColor: Colors.black,
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
                    borderColor: ColorConstant.gold,
                    borderRadius: 12,
                    borderLength: 30,
                    borderWidth: 4,
                    cutOutSize: 280,
                  ),
                ),
              ),
            ],
          ),
          // Top bar: back + event context.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: getPadding(left: 8, right: 8, top: 8),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => Get.back(),
                      child: Container(
                        height: getSize(36),
                        width: getSize(36),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.arrow_back_ios_new,
                            color: Colors.white, size: 18),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Obx(() => Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              MyText(
                                title: controller.eventTitle.isNotEmpty
                                    ? controller.eventTitle
                                    : 'Door check-in',
                                family: 'Manrope',
                                customWeight: FontWeight.w700,
                                fontSize: 15,
                                clr: ColorConstant.whiteA700,
                              ),
                              if (controller.checkedInCount.value > 0)
                                MyText(
                                  title:
                                      '${controller.checkedInCount.value} checked in',
                                  family: 'Inter',
                                  fontSize: 11,
                                  clr: ColorConstant.nightMuted,
                                ),
                            ],
                          )),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Event picker when opened without an event (bottom-bar Scan).
          if (controller.eventId.isEmpty)
            Positioned(
              left: 16,
              right: 16,
              bottom: 40,
              child: Obx(() => Container(
                    constraints: BoxConstraints(maxHeight: getSize(300)),
                    decoration: BoxDecoration(
                      color: ColorConstant.nightSurface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: ColorConstant.nightBorder),
                    ),
                    child: ListView(
                      shrinkWrap: true,
                      padding: getPadding(all: 8),
                      children: [
                        Padding(
                          padding: getPadding(all: 12),
                          child: MyText(
                            title: 'Choose an event to scan for',
                            family: 'Inter',
                            fontSize: 13,
                            clr: ColorConstant.nightMuted,
                          ),
                        ),
                        if (controller.isLoadingEvents.value)
                          const Padding(
                            padding: EdgeInsets.all(20),
                            child: Center(child: CircularProgressIndicator()),
                          )
                        else if (controller.myEvents.isEmpty)
                          Padding(
                            padding: getPadding(all: 16),
                            child: MyText(
                              title: "No published events yet",
                              family: 'Inter',
                              fontSize: 13,
                              clr: ColorConstant.white60,
                            ),
                          )
                        else
                          ...controller.myEvents.map((e) => ListTile(
                                dense: true,
                                title: MyText(
                                  title: (e['title'] ?? 'Event').toString(),
                                  family: 'Inter',
                                  fontSize: 14,
                                  clr: ColorConstant.whiteA700,
                                ),
                                subtitle: MyText(
                                  title: (e['startsAt'] ?? '').toString(),
                                  family: 'Inter',
                                  fontSize: 11,
                                  clr: ColorConstant.white60,
                                ),
                                onTap: () {
                                  controller.eventId = e['id'].toString();
                                  controller.eventTitle =
                                      (e['title'] ?? '').toString();
                                },
                              )),
                      ],
                    ),
                  )),
            ),
          // Result overlay: valid (gold) / already-used / wrong-event / error.
          if (result != null)
            Positioned.fill(
              child: Container(
                color: Colors.black87,
                child: Center(
                  child: _ResultCard(
                    result: result,
                    onDone: _resume,
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
      final code = scanData.code;
      if (code == null || code.isEmpty) return;
      _onScanned(code);
    });
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result, required this.onDone});

  final Map<String, dynamic> result;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final kind = result['result']?.toString() ?? '';
    final ok = kind == 'OK';
    final color = ok
        ? ColorConstant.gold
        : kind == 'ALREADY_USED'
            ? ColorConstant.errorRed
            : ColorConstant.warningOrange;
    final icon = ok
        ? Icons.check_circle_outline
        : kind == 'ALREADY_USED'
            ? Icons.cancel_outlined
            : Icons.info_outline;
    final title = switch (kind) {
      'OK' => 'Valid — welcome',
      'ALREADY_USED' => 'Already scanned',
      'WRONG_EVENT' => 'Wrong event',
      'NOT_FOUND' => 'Ticket not found',
      'FORBIDDEN' => 'Not your event',
      _ => 'Scan failed',
    };
    final subtitle = switch (kind) {
      'OK' => 'Checked in just now',
      'ALREADY_USED' =>
        'This ticket was already used${result['ticket']?['checkedInAt'] != null ? ' at ${result['ticket']['checkedInAt']}' : ''}',
      'WRONG_EVENT' => 'This ticket belongs to a different event',
      'NOT_FOUND' => 'No ticket matches that code',
      'FORBIDDEN' => 'Only the event creator can check in guests',
      _ => result['message']?.toString() ?? 'Try again',
    };
    final tier = result['ticket']?['tierName']?.toString() ??
        result['ticket']?['sectionName']?.toString() ??
        '';

    return Container(
      margin: getMargin(left: 32, right: 32),
      padding: getPadding(all: 28),
      decoration: BoxDecoration(
        color: ColorConstant.nightSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.5), width: 1.5),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 64),
          const SizedBox(height: 16),
          Text(
            title,
            style: GoogleFonts.bricolageGrotesque(
              color: ColorConstant.whiteA700,
              fontSize: 24,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: GoogleFonts.ibmPlexSansArabic(
              color: ColorConstant.nightMuted,
              fontSize: 14,
            ),
          ),
          if (tier.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              tier,
              style: GoogleFonts.bricolageGrotesque(
                color: ColorConstant.gold,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: PrimaryPillButton(
              text: 'Scan next',
              onTap: onDone,
            ),
          ),
        ],
      ),
    );
  }
}
