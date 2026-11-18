import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:qr_code_scanner/qr_code_scanner.dart';

import '../controllers/my_scanner_controller.dart';

class MyScannerView extends StatefulWidget {
  const MyScannerView({Key? key}) : super(key: key);

  @override
  _QRScannerPageState createState() => _QRScannerPageState();
}

class _QRScannerPageState extends State<MyScannerView> {
  final controller = Get.put(MyScannerController());
  final _manualController = TextEditingController();
  bool _checkingIn = false;

  @override
  void initState() {
    super.initState();
    final args = Get.arguments;
    if (args is Map && args['eventId'] != null) {
      controller.eventId.value = args['eventId'].toString();
      controller.eventTitle.value = args['title']?.toString() ?? '';
    }
    controller.loadEventsIfNeeded();
  }

  @override
  void dispose() {
    _manualController.dispose();
    super.dispose();
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
    final eventId = controller.eventId.value;
    if (_checkingIn || eventId.isEmpty || controller.lastResult.value != null) {
      return;
    }
    final trimmed = code.trim();
    if (trimmed.isEmpty) return;
    // Decision-18: after 30 min offline, new scans are blocked unless an
    // admin overrides from the result card.
    if (controller.offlineBlocked) {
      controller.lastResult.value = {
        'result': 'OFFLINE_BLOCKED',
        'message':
            'Offline for over 30 minutes, scans are paused until you sync.',
      };
      return;
    }
    _checkingIn = true;
    controller.lastResult.value = null;
    controller.controller?.pauseCamera();
    try {
      final res = await ApiService.checkInTicket(eventId, trimmed);
      controller.lastResult.value = res;
      controller.lastSyncedAt.value = DateTime.now();
      if (res['result'] == 'OK') controller.noteCheckedIn();
      // We're online, flush anything queued while offline.
      controller.flushQueue();
    } catch (e) {
      if (MyScannerController.looksOffline(e)) {
        await controller.queueScan(trimmed);
        controller.lastResult.value = {
          'result': 'QUEUED',
          'message': 'No connection, scan saved to sync when back online.',
        };
      } else {
        controller.lastResult.value = {
          'result': 'ERROR',
          'message': e.toString()
        };
      }
    } finally {
      _checkingIn = false;
    }
  }

  void _resume() {
    controller.lastResult.value = null;
    controller.controller?.resumeCamera();
  }

  void _submitManual() {
    final code = _manualController.text;
    _manualController.clear();
    _onScanned(code);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.nightDeep,
      body: Obx(() {
        final result = controller.lastResult.value;
        return Stack(
          children: [
            Column(
              children: [
                Expanded(
                  flex: 4,
                  child: QRView(
                    key: controller.qrKey,
                    onQRViewCreated: _onQRViewCreated,
                    overlay: QrScannerOverlayShape(
                      borderColor: ColorConstant.gold,
                      borderRadius: 18,
                      borderLength: 34,
                      borderWidth: 5,
                      cutOutSize: 280,
                    ),
                  ),
                ),
              ],
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Padding(
                  padding: getPadding(left: 12, right: 12, top: 10),
                  child: Row(
                    children: [
                      _roundButton(
                        icon: Icons.arrow_back_ios_new_rounded,
                        onTap: () => Get.back(),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              controller.eventTitle.value.isNotEmpty
                                  ? controller.eventTitle.value
                                  : 'Door check-in',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style:
                                  sahraText(size: 16, weight: FontWeight.w700),
                            ),
                            Text(
                              controller.lastSyncedLabel +
                                  (controller.pendingScans.isNotEmpty
                                      ? ' · ${controller.pendingScans.length} queued'
                                      : ''),
                              style: sahraText(
                                  color: controller.pendingScans.isNotEmpty ||
                                          controller.offlineWarning
                                      ? ColorConstant.warningOrange
                                      : ColorConstant.nightMuted,
                                  size: 11),
                            ),
                            if (controller.checkedInCount.value > 0)
                              Text(
                                '${controller.checkedInCount.value} in',
                                style: sahraText(
                                    color: ColorConstant.gold,
                                    size: 12,
                                    weight: FontWeight.w600),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (controller.eventId.value.isEmpty)
              Positioned(
                left: 16,
                right: 16,
                bottom: 112,
                child: _eventPicker(),
              ),
            if (controller.eventId.value.isNotEmpty)
              Positioned(
                left: 16,
                right: 16,
                bottom: 24,
                child: _manualEntry(),
              ),
            if (result != null)
              Positioned.fill(
                child: Container(
                  color: Colors.black.withValues(alpha: .86),
                  child: Center(
                    child: _ResultCard(
                      result: result,
                      onDone: _resume,
                      onOverride: () =>
                          controller.offlineOverride.value = true,
                      isAdmin: controller.isAdmin.value,
                    ),
                  ),
                ),
              ),
          ],
        );
      }),
    );
  }

  Widget _roundButton({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: ColorConstant.night.withValues(alpha: .82),
          shape: BoxShape.circle,
          border: Border.all(color: ColorConstant.nightBorder),
        ),
        child: Icon(icon, color: ColorConstant.whiteA700, size: 18),
      ),
    );
  }

  Widget _eventPicker() {
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: getSize(300)),
      child: SahraCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Choose an event to scan for',
                style: sahraText(size: 14, weight: FontWeight.w600)),
            const SizedBox(height: 8),
            if (controller.isLoadingEvents.value)
              const Padding(
                padding: EdgeInsets.all(20),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (controller.myEvents.isEmpty)
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text('No published events yet',
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 13)),
              )
            else
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: controller.myEvents.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, index) {
                    final e = controller.myEvents[index];
                    return GestureDetector(
                      onTap: () => controller.selectEvent(e),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: ColorConstant.nightElevated,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text((e['title'] ?? 'Event').toString(),
                                      style: sahraText(
                                          size: 14, weight: FontWeight.w600)),
                                  Text(
                                      formatEventDate(e['startsAt']?.toString(),
                                          tz: e['venueTimezone']?.toString(),
                                          includeTime: true),
                                      style: sahraText(
                                          color: ColorConstant.nightMuted,
                                          size: 11)),
                                ],
                              ),
                            ),
                            Icon(Icons.chevron_right_rounded,
                                color: ColorConstant.gold, size: 20),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _manualEntry() {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: ColorConstant.night.withValues(alpha: .88),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: ColorConstant.nightBorder),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Point at the ticket QR · or enter code',
              style: sahraText(color: ColorConstant.nightMuted, size: 12)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _manualController,
                  textCapitalization: TextCapitalization.characters,
                  style: sahraText(color: ColorConstant.whiteA700, size: 14),
                  decoration: InputDecoration(
                    isDense: true,
                    filled: true,
                    fillColor: ColorConstant.nightSurface,
                    hintText: 'Ticket code',
                    hintStyle:
                        sahraText(color: ColorConstant.nightMuted, size: 13),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: ColorConstant.nightBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: ColorConstant.nightBorder),
                    ),
                  ),
                  onSubmitted: (_) => _submitManual(),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _checkingIn ? null : _submitManual,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: ColorConstant.gold,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('Check in',
                      style: sahraText(
                          color: ColorConstant.night,
                          size: 13,
                          weight: FontWeight.w700)),
                ),
              ),
            ],
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
  const _ResultCard(
      {required this.result,
      required this.onDone,
      this.onOverride,
      this.isAdmin = false});

  bool _isAdmin() => isAdmin;

  final Map<String, dynamic> result;
  final VoidCallback onDone;
  final VoidCallback? onOverride;
  final bool isAdmin;

  @override
  Widget build(BuildContext context) {
    final kind = result['result']?.toString() ?? '';
    final ok = kind == 'OK';
    // Partial admit, group tickets can check in a subset of their party
    // (spec 55). Rendered when the API reports quantity/admitted.
    final ticket0 = result['ticket'];
    final admitQty =
        ticket0 is Map ? (ticket0['quantity'] as num?)?.toInt() ?? 1 : 1;
    final admitted =
        ticket0 is Map ? (ticket0['admitted'] as num?)?.toInt() ?? admitQty : admitQty;
    final partial = ok && admitted < admitQty;

    final color = ok && !partial
        ? ColorConstant.gold
        : kind == 'ALREADY_USED'
            ? ColorConstant.errorRed
            : ColorConstant.warningOrange;
    final icon = ok
        ? (partial ? Icons.group_add_outlined : Icons.check_circle_rounded)
        : kind == 'ALREADY_USED'
            ? Icons.cancel_rounded
            : kind == 'QUEUED'
                ? Icons.cloud_upload_outlined
                : Icons.info_rounded;
    final title = switch (kind) {
      'OK' => partial ? 'Partial check-in' : 'Valid ticket',
      'ALREADY_USED' => 'Already scanned',
      'WRONG_EVENT' => 'Wrong event',
      'NOT_FOUND' => 'Ticket not found',
      'FORBIDDEN' => 'Not your event',
      'QUEUED' => 'Offline, queued',
      'OFFLINE_BLOCKED' => 'Paused, too long offline',
      _ => 'Scan failed',
    };
    final subtitle = switch (kind) {
      'OK' => partial
          ? '$admitted of $admitQty admitted, scan again for the rest of the party'
          : 'Checked in just now',
      'ALREADY_USED' =>
        'Checked in${result['ticket']?['checkedInAt'] != null ? ' at ${formatEventTime(result['ticket']['checkedInAt']?.toString())}' : ''}. Don’t admit; send to the help desk if there’s a dispute.',
      'WRONG_EVENT' => 'This ticket belongs to a different event',
      'NOT_FOUND' => 'No ticket matches that code',
      'FORBIDDEN' => 'Only the event creator can check in guests',
      'OFFLINE_BLOCKED' =>
        'You\'ve been offline too long. Sync the queued scans first, an admin can override.',
      _ => result['message']?.toString() ?? 'Try again',
    };
    final ticket = result['ticket'];
    final tier = ticket is Map
        ? (ticket['tierName']?.toString() ??
            ticket['sectionName']?.toString() ??
            '')
        : '';
    final code = ticket is Map ? ticket['code']?.toString() ?? '' : '';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 28),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: ColorConstant.nightSurface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: color.withValues(alpha: .55), width: 1.4),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 74,
            height: 74,
            decoration: BoxDecoration(
              color: color.withValues(alpha: .14),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 38),
          ),
          const SizedBox(height: 16),
          Text(title,
              style: GoogleFonts.bricolageGrotesque(
                color: ColorConstant.whiteA700,
                fontSize: 25,
                fontWeight: FontWeight.w700,
              )),
          const SizedBox(height: 7),
          Text(subtitle,
              textAlign: TextAlign.center,
              style: sahraText(
                  color: ColorConstant.nightMuted, size: 13, height: 1.45)),
          if (tier.isNotEmpty || code.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              [if (tier.isNotEmpty) tier, if (code.isNotEmpty) code]
                  .join(' · '),
              style: sahraText(
                  color: ColorConstant.gold, size: 13, weight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: 22),
          // Decision-18: an admin may keep scanning past the 30-min window.
          if (kind == 'OFFLINE_BLOCKED' && onOverride != null && _isAdmin()) ...[
            SizedBox(
              width: double.infinity,
              child: SahraPillButton(
                  label: 'Override (admin)', onTap: () {
                    onOverride!();
                    onDone();
                  }),
            ),
            const SizedBox(height: 10),
          ],
          SizedBox(
            width: double.infinity,
            child: SahraPillButton(
                label: 'Scan next', dark: kind == 'OFFLINE_BLOCKED',
                onTap: onDone),
          ),
        ],
      ),
    );
  }
}
