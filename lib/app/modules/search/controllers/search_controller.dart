import 'dart:async';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/services/api_service.dart';

class MySearchController extends GetxController {
  final TextEditingController searchController = TextEditingController();
  Timer? _debounce;

  final Rxn<String> selectedCategory = Rxn<String>();
  final RxList<Map<String, dynamic>> recentEvents =
      <Map<String, dynamic>>[].obs;
  final RxList<Map<String, dynamic>> searchResults =
      <Map<String, dynamic>>[].obs;
  final RxBool searchLoading = false.obs;
  final Rxn<String> searchError = Rxn<String>();
  final RxBool isEmpty = true.obs;

  void onSearchChanged(String query) {
    _debounce?.cancel();
    final q = query.trim();
    isEmpty.value = q.isEmpty;
    if (q.isEmpty) {
      searchResults.clear();
      searchError.value = null;
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _search(q);
    });
  }

  Future<List<Map<String, dynamic>>> _availableEvents({String? q}) async {
    final collected = <Map<String, dynamic>>[];
    String? cursor;
    for (var page = 0; page < 3 && collected.length < 100; page++) {
      final res = await ApiService.eventsPage(q: q, cursor: cursor, limit: 100);
      final items = ((res['items'] as List?) ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      collected.addAll(items.where((e) =>
          isAvailable(e['startsAt']?.toString(), e['endsAt']?.toString())));
      final next = res['nextCursor'];
      if (next is String && next.isNotEmpty) {
        cursor = next;
      } else {
        break;
      }
    }
    return collected.take(100).toList();
  }

  Future<void> _search(String q) async {
    searchLoading.value = true;
    searchError.value = null;
    try {
      searchResults.value = await _availableEvents(q: q);
    } catch (e) {
      searchError.value = e.toString().replaceFirst('Exception: ', '');
      searchResults.clear();
    } finally {
      searchLoading.value = false;
    }
  }

  Future<void> fetchRecentEvents() async {
    try {
      recentEvents.value = await _availableEvents();
    } catch (_) {
      // Recent events are best-effort — leave the list empty on failure.
    }
  }

  @override
  void onInit() {
    super.onInit();
    fetchRecentEvents();
  }

  @override
  void onClose() {
    _debounce?.cancel();
    searchController.dispose();
    super.onClose();
  }
}
