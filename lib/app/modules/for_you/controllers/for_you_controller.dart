import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/services/api_service.dart';

class ForYouController extends GetxController {
  RxInt currentImage = 0.obs;

  final RxList<Map<String, dynamic>> events = <Map<String, dynamic>>[].obs;
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();
  final RxString city = 'Dubai'.obs;
  final RxBool hasUnread = false.obs;

  /// Spec home: greeting name (empty for guests) and the personal invites
  /// still waiting on your reply — they drive the RSVP cards.
  final RxString firstName = ''.obs;
  final RxBool isGuest = false.obs;
  final RxList<Map<String, dynamic>> invites = <Map<String, dynamic>>[].obs;

  static const cities = ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha', 'Kuwait City'];

  /// Feed filtered by the selected city (matches the prototype, where
  /// non-Dubai cities show the empty state). Events without a city field
  /// are always shown.
  List<Map<String, dynamic>> get cityEvents => events.where((e) {
        final c = _cityOf(e);
        if (c.isEmpty) return true;
        return c.toLowerCase() == city.value.toLowerCase();
      }).toList();

  /// Best-effort city resolution for an event payload. Most records do not
  /// carry a `city` field, so fall back to the venue strings and finally
  /// the venue IANA timezone for the regions the feed covers.
  String _cityOf(Map<String, dynamic> e) {
    final direct = (e['city'] ?? e['area'] ?? '').toString();
    if (direct.isNotEmpty) return direct;
    final blob =
        '${e['venue'] ?? ''} ${e['location'] ?? ''} ${e['address'] ?? ''}'
            .toLowerCase();
    for (final c in cities) {
      if (blob.contains(c.toLowerCase())) return c;
    }
    const tzToCity = {
      'Asia/Dubai': 'Dubai',
      'Asia/Riyadh': 'Riyadh',
      'Asia/Qatar': 'Doha',
      'Asia/Kuwait': 'Kuwait City',
      'Asia/Muscat': 'Muscat',
      'Asia/Bahrain': 'Manama',
    };
    return tzToCity[(e['venueTimezone'] ?? '').toString()] ?? '';
  }

  @override
  void onInit() {
    super.onInit();
    _restoreCity();
    fetchEvents();
    _checkUnread();
    _loadSession();
  }

  /// Greeting name + pending personal invites. Guests skip the call —
  /// /me/plans needs auth and the spec hides RSVP cards for signed-out.
  Future<void> _loadSession() async {
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      final loggedIn = await prefs.getIsLoggedIn() ?? false;
      isGuest.value = !loggedIn;
      if (!loggedIn) return;
      final name = (await prefs.getUserName()).trim();
      firstName.value = name.split(' ').first;
      final plans = await ApiService.mePlansFull();
      invites.value = (plans['waiting_on_you'] as List? ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (_) {}
  }

  Future<void> _restoreCity() async {
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      final saved = await prefs.getUserCity();
      if (saved.isNotEmpty) city.value = saved;
    } catch (_) {}
  }

  Future<void> selectCity(String c) async {
    city.value = c;
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      prefs.setUserCity(city: c);
    } catch (_) {}
  }

  Future<void> _checkUnread() async {
    try {
      final res = await ApiService.notifications();
      final items = (res['notifications'] as List?) ??
          (res['items'] as List?) ??
          const [];
      hasUnread.value = items.any((n) =>
          n is Map && (n['unread'] == true || n['read'] == false));
    } catch (_) {}
  }

  void openInbox() {
    hasUnread.value = false;
    Get.toNamed(Routes.NOTIFICATIONS_PAGE);
  }

  Future<void> fetchEvents() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final collected = <Map<String, dynamic>>[];
      String? cursor;
      for (var page = 0; page < 3 && collected.length < 100; page++) {
        final Map<String, dynamic> res;
        try {
          res = await ApiService.eventsPage(cursor: cursor, limit: 100);
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
      events.value = collected.take(100).toList();
      if (currentImage.value >= events.length && events.isNotEmpty) {
        currentImage.value = 0;
      }
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  /// Currently visible hero event (falls back to the first event).
  Map<String, dynamic>? get currentEvent {
    final list = cityEvents;
    if (list.isEmpty) return null;
    final i = currentImage.value.clamp(0, list.length - 1);
    return list[i];
  }

  void openEvent(Map<String, dynamic> event) {
    Get.toNamed(Routes.EVENT_DETAIL, arguments: {
      'id': event['id']?.toString() ?? '',
      'title': event['title']?.toString() ?? '',
    });
  }
}
