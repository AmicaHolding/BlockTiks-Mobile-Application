import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class AllGuestsController extends GetxController {
  // Events the current creator can pick from (soonest first).
  final RxList<Map<String, dynamic>> events = <Map<String, dynamic>>[].obs;
  final RxString selectedEventId = ''.obs;
  String get selectedEventTitle {
    for (final e in events) {
      if (e['id'] == selectedEventId.value)
        return (e['title'] ?? '').toString();
    }
    return '';
  }

  final RxList<Map<String, dynamic>> guests = <Map<String, dynamic>>[].obs;
  final RxInt checkedIn = 0.obs;
  final RxInt total = 0.obs;
  final RxBool isLoading = false.obs;
  final RxnString loadError = RxnString();

  // Manual check-in feedback for the tapped row.
  final RxnString checkInMessage = RxnString();
  final RxString checkingInCode = ''.obs;

  List<String> filter = ['All', 'Checked In', 'Not Checked In'];
  RxInt selectedFilter = 0.obs;
  final RxString searchQuery = ''.obs;

  void setSearch(String value) {
    searchQuery.value = value.trim().toLowerCase();
  }

  @override
  void onInit() {
    super.onInit();
    final args = Get.arguments;
    if (args is Map && args['eventId'] != null) {
      selectedEventId.value = args['eventId'].toString();
    }
    loadEvents();
  }

  Future<void> loadEvents() async {
    try {
      final mine = await ApiService.myEvents();
      events.value = mine
          .where((e) => (e['status']?.toString() ?? '') == 'PUBLISHED')
          .toList();
      if (selectedEventId.value.isEmpty && events.isNotEmpty) {
        selectedEventId.value = events.first['id'].toString();
      }
      await fetchGuests();
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    }
  }

  Future<void> selectEvent(String eventId) async {
    selectedEventId.value = eventId;
    await fetchGuests();
  }

  Future<void> fetchGuests() async {
    if (selectedEventId.value.isEmpty) return;
    isLoading.value = true;
    loadError.value = null;
    try {
      final res = await ApiService.eventGuests(selectedEventId.value);
      guests.value = (res['guests'] as List? ?? [])
          .map((g) => Map<String, dynamic>.from(g as Map))
          .toList();
      checkedIn.value = (res['checkedIn'] as num?)?.toInt() ?? 0;
      total.value = (res['total'] as num?)?.toInt() ?? guests.length;
      filterItems();
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  void filterItems() {
    // Filtering happens view-side via `visibleGuests`; nothing to do here.
  }

  List<Map<String, dynamic>> get visibleGuests {
    Iterable<Map<String, dynamic>> out = guests;
    final q = searchQuery.value;
    if (q.isNotEmpty) {
      out = out.where((g) {
        final haystack = [
          g['name'],
          g['email'],
          g['code'],
          g['orderId'],
          g['tierName'],
          g['sectionName'],
        ].map((e) => e?.toString().toLowerCase() ?? '').join(' ');
        return haystack.contains(q);
      });
    }
    switch (selectedFilter.value) {
      case 1:
        return out.where((g) => g['status'] == 'USED').toList();
      case 2:
        return out.where((g) => g['status'] != 'USED').toList();
      default:
        return out.toList();
    }
  }

  /// Manual check-in fallback for when scanning fails, same endpoint.
  Future<void> checkIn(String code) async {
    if (checkingInCode.value.isNotEmpty) return;
    checkingInCode.value = code;
    checkInMessage.value = null;
    try {
      final res = await ApiService.checkInTicket(selectedEventId.value, code);
      final kind = res['result']?.toString() ?? '';
      checkInMessage.value = kind == 'OK'
          ? 'Checked in'
          : kind == 'ALREADY_USED'
              ? 'Already checked in'
              : 'Check-in failed: $kind';
      if (kind == 'OK') await fetchGuests();
    } catch (e) {
      checkInMessage.value = 'Check-in failed';
    } finally {
      checkingInCode.value = '';
    }
  }

  /// Undo a manual check-in (spec 56, mistakes at the door are fixable).
  Future<void> undoCheckIn(String code) async {
    if (checkingInCode.value.isNotEmpty) return;
    checkingInCode.value = code;
    checkInMessage.value = null;
    try {
      await ApiService.undoCheckIn(code);
      checkInMessage.value = 'Check-in undone';
      await fetchGuests();
    } catch (e) {
      checkInMessage.value = 'Undo failed';
    } finally {
      checkingInCode.value = '';
    }
  }
}
