import 'dart:convert';

import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';

class MyScannerController extends GetxController {
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');
  QRViewController? controller;

  /// Event being scanned for. Set from route arguments, or picked from the
  /// event list when the scanner is opened from the bottom bar.
  final RxString eventId = ''.obs;
  final RxString eventTitle = ''.obs;

  /// Latest check-in API result: { result: OK|ALREADY_USED|..., ticket? }.
  final Rxn<Map<String, dynamic>> lastResult = Rxn<Map<String, dynamic>>();

  // Event picker state (used when no eventId was passed in).
  final RxList<Map<String, dynamic>> myEvents = <Map<String, dynamic>>[].obs;
  final RxBool isLoadingEvents = false.obs;
  final RxInt checkedInCount = 0.obs;

  /// Offline scan queue, scans taken while the check-in API was unreachable
  /// (spec 54: "scans queue locally and sync when back").
  final RxList<Map<String, String>> pendingScans =
      <Map<String, String>>[].obs;

  /// Last successful contact with the check-in API (shown as
  /// "Last synced X min ago" in the header).
  final Rxn<DateTime> lastSyncedAt = Rxn<DateTime>();

  String get lastSyncedLabel {
    final at = lastSyncedAt.value;
    if (at == null) return 'Never synced';
    final mins = DateTime.now().difference(at).inMinutes;
    if (mins < 1) return 'Last synced just now';
    return 'Last synced ${mins} min ago';
  }

  Future<void> restoreQueue() async {
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      final raw = await prefs.getDoorQueue();
      await _loadRole();
      if (raw.isEmpty) return;
      final list = (jsonDecode(raw) as List?) ?? [];
      pendingScans.value = list
          .whereType<Map>()
          .map((e) => e.map((k, v) => MapEntry(k.toString(), v.toString())))
          .toList();
    } catch (_) {}
  }

  Future<void> _loadRole() async {
    try {
      final list = await ApiService.memberships();
      if (list.isEmpty) return;
      final role = list.first['role']?.toString().toLowerCase() ?? '';
      isAdmin.value = role.contains('admin') || role.contains('co-host');
    } catch (_) {}
  }

  Future<void> _persistQueue() async {
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      prefs.setDoorQueue(queueJson: jsonEncode(pendingScans.toList()));
    } catch (_) {}
  }

  /// Queue a scan that couldn't reach the API (offline). Flushed by
  /// flushQueue() once connectivity is back.
  Future<void> queueScan(String code) async {
    pendingScans.add({
      'eventId': eventId.value,
      'code': code,
      'at': DateTime.now().toIso8601String(),
    });
    await _persistQueue();
  }

  /// Retry every queued scan, drops entries the server has decided on
  /// (OK/ALREADY_USED/etc.), keeps the rest for the next attempt.
  Future<void> flushQueue() async {
    if (pendingScans.isEmpty) return;
    final remaining = <Map<String, String>>[];
    for (final scan in pendingScans) {
      final eid = scan['eventId'] ?? '';
      final code = scan['code'] ?? '';
      if (eid.isEmpty || code.isEmpty) continue;
      try {
        final res = await ApiService.checkInTicket(eid, code);
        if (res['result'] == null) {
          remaining.add(scan); // no decision, keep queued
        } else if (res['result'] == 'OK' && eid == eventId.value) {
          noteCheckedIn();
        }
      } catch (_) {
        remaining.add(scan);
      }
    }
    pendingScans.value = remaining;
    await _persistQueue();
  }

  /// Decision-18: warn once we've been offline 5+ minutes; block new
  /// scans after 30 unless an admin overrides.
  final RxBool offlineOverride = false.obs;
  /// Admin role from memberships, needed for the 30-min override.
  final RxBool isAdmin = false.obs;

  int get offlineMinutes {
    final at = lastSyncedAt.value;
    if (at == null) return 0;
    return DateTime.now().difference(at).inMinutes;
  }

  /// 5+ min offline → warning tone on the sync line.
  bool get offlineWarning =>
      pendingScans.isNotEmpty && offlineMinutes >= 5;

  /// 30+ min offline → block new scans unless admin overrides (decision-18).
  bool get offlineBlocked =>
      pendingScans.isNotEmpty &&
      offlineMinutes >= 30 &&
      !isAdmin.value &&
      !offlineOverride.value;

  /// True when an error looks like a network/offline failure rather than a
  /// server-decided scan result.
  /// TODO(api-gap: ApiService wraps DioException into a plain Exception,   /// exposing a typed error would make this check reliable)
  static bool looksOffline(Object error) {
    final m = error.toString().toLowerCase();
    return m.contains('socketexception') ||
        m.contains('failed host lookup') ||
        m.contains('network') ||
        m.contains('timed out') ||
        m.contains('connection');
  }

  // loadEventsIfNeeded() is invoked by the view once route arguments
  // (eventId) have been applied, calling it here would race them.

  Future<void> loadEventsIfNeeded() async {
    await restoreQueue();
    if (eventId.value.isNotEmpty) {
      refreshCheckedInCount();
      return;
    }
    if (isLoadingEvents.value) return;
    isLoadingEvents.value = true;
    try {
      final events = await ApiService.myEvents();
      // Door mode cares about upcoming/published events.
      myEvents.value = events
          .where((e) => (e['status']?.toString() ?? '') == 'PUBLISHED')
          .toList();
      // Default to the soonest event if there's exactly one obvious choice.
      if (myEvents.length == 1) {
        await selectEvent(myEvents.first);
      }
    } catch (_) {
      // Picker just stays empty; the guest can go back.
    } finally {
      isLoadingEvents.value = false;
    }
  }

  Future<void> selectEvent(Map<String, dynamic> event) async {
    eventId.value = event['id']?.toString() ?? '';
    eventTitle.value = event['title']?.toString() ?? '';
    await refreshCheckedInCount();
  }

  Future<void> refreshCheckedInCount() async {
    if (eventId.value.isEmpty) return;
    try {
      final res = await ApiService.eventGuests(eventId.value);
      final count = res['checkedIn'];
      if (count is num) checkedInCount.value = count.toInt();
    } catch (_) {
      // Scanner still works without the door-count header.
    }
  }

  void noteCheckedIn() => checkedInCount.value++;

  @override
  void dispose() {
    controller?.dispose();
    super.dispose();
  }
}
