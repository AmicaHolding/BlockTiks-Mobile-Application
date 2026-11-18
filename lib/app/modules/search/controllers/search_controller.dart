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

  /// Result segment: 'events' | 'venues' | 'artists'. There is deliberately
  /// no Users tab, account search is not exposed on mobile (privacy).
  final RxString segment = 'events'.obs;

  /// In-session recent searches.
  /// TODO(api-gap: persist recent searches server-side per account)
  final RxList<String> recentSearches = <String>[].obs;

  /// When set, the events tab is additionally narrowed to this venue/artist.
  final Rxn<String> focus = Rxn<String>();

  void onSearchChanged(String query) {
    _debounce?.cancel();
    final q = query.trim();
    isEmpty.value = q.isEmpty;
    if (q.isEmpty) {
      searchResults.clear();
      searchError.value = null;
      focus.value = null;
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
      final Map<String, dynamic> res;
      try {
        res = await ApiService.eventsPage(q: q, cursor: cursor, limit: 100);
      } catch (_) {
        if (collected.isEmpty) rethrow;
        break;
      }
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
      // Push to the top of recent searches, de-duplicated (latest first).
      recentSearches.removeWhere((r) => r.toLowerCase() == q.toLowerCase());
      recentSearches.insert(0, q);
      if (recentSearches.length > 6) recentSearches.removeLast();
    } catch (e) {
      searchError.value = e.toString().replaceFirst('Exception: ', '');
      searchResults.clear();
    } finally {
      searchLoading.value = false;
    }
  }

  void applyQuery(String q) {
    searchController.text = q;
    onSearchChanged(q);
  }

  void clearRecent() => recentSearches.clear();

  /// Venues tab, derived client-side until the search contract exists.
  /// TODO(api-gap: `GET /search?type=venue&q=` returning venue records)
  List<Map<String, dynamic>> get venueResults {
    final out = <String, int>{};
    for (final e in searchResults) {
      final v = (e['venue'] ?? e['location'] ?? '').toString().trim();
      if (v.isEmpty) continue;
      out[v] = (out[v] ?? 0) + 1;
    }
    final q = searchController.text.trim().toLowerCase();
    return out.entries
        .where((x) => x.key.toLowerCase().contains(q))
        .map((x) => {'name': x.key, 'count': x.value})
        .toList();
  }

  /// Artists tab, derived from event artist/organiser fields.
  /// TODO(api-gap: `GET /search?type=artist&q=` returning artist records)
  List<Map<String, dynamic>> get artistResults {
    final out = <String, int>{};
    final q = searchController.text.trim().toLowerCase();
    for (final e in searchResults) {
      final raw = e['artists'] ?? e['artist'] ?? e['organiser'];
      final names = raw is List
          ? raw.map((x) => x.toString()).toList()
          : raw == null
              ? <String>[]
              : raw.toString().split(',');
      for (final n in names) {
        final name = n.trim();
        if (name.isEmpty || !name.toLowerCase().contains(q)) continue;
        out[name] = (out[name] ?? 0) + 1;
      }
    }
    return out.entries
        .map((x) => {'name': x.key, 'count': x.value})
        .toList();
  }

  void focusOn(String name) {
    focus.value = name;
    segment.value = 'events';
  }

  Future<void> fetchRecentEvents() async {
    try {
      recentEvents.value = await _availableEvents();
    } catch (_) {
      // Recent events are best-effort, leave the list empty on failure.
    }
  }

  @override
  void onInit() {
    super.onInit();
    fetchRecentEvents();
  }

  /// Events tab results, narrowed by a tapped venue/artist when set.
  List<Map<String, dynamic>> get eventResults {
    final f = focus.value;
    if (f == null) return searchResults;
    final lf = f.toLowerCase();
    return searchResults.where((e) {
      final fields = [
        e['venue'],
        e['location'],
        e['artists'] is List ? (e['artists'] as List).join(' ') : e['artists'],
        e['artist'],
        e['organiser'],
      ];
      return fields
          .any((v) => v != null && v.toString().toLowerCase().contains(lf));
    }).toList();
  }

  @override
  void onClose() {
    _debounce?.cancel();
    searchController.dispose();
    super.onClose();
  }
}
