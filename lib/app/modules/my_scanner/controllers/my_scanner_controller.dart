import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';

class MyScannerController extends GetxController {
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');
  QRViewController? controller;

  /// Event being scanned for. Set from route arguments, or picked from the
  /// event list when the scanner is opened from the bottom bar.
  String eventId = '';
  String eventTitle = '';

  /// Latest check-in API result: { result: OK|ALREADY_USED|..., ticket? }.
  final Rxn<Map<String, dynamic>> lastResult = Rxn<Map<String, dynamic>>();

  // Event picker state (used when no eventId was passed in).
  final RxList<Map<String, dynamic>> myEvents = <Map<String, dynamic>>[].obs;
  final RxBool isLoadingEvents = false.obs;
  final RxInt checkedInCount = 0.obs;

  // loadEventsIfNeeded() is invoked by the view once route arguments
  // (eventId) have been applied — calling it here would race them.

  Future<void> loadEventsIfNeeded() async {
    if (eventId.isNotEmpty || isLoadingEvents.value) return;
    isLoadingEvents.value = true;
    try {
      final events = await ApiService.myEvents();
      // Door mode cares about upcoming/published events.
      myEvents.value = events
          .where((e) =>
              (e['status']?.toString() ?? '') == 'PUBLISHED')
          .toList();
      // Default to the soonest event if there's exactly one obvious choice.
      if (myEvents.length == 1) {
        eventId = myEvents.first['id'].toString();
        eventTitle = (myEvents.first['title'] ?? '').toString();
      }
    } catch (_) {
      // Picker just stays empty; the guest can go back.
    } finally {
      isLoadingEvents.value = false;
    }
  }

  void noteCheckedIn() => checkedInCount.value++;

  @override
  void dispose() {
    controller?.dispose();
    super.dispose();
  }
}
