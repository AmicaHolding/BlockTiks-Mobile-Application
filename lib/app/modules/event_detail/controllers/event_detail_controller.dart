import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class EventDetailController extends GetxController {
  RxInt platinumCount = 0.obs;
  RxInt goldCount = 0.obs;
  RxInt silverCount = 0.obs;
  RxInt bronzeCount = 0.obs;

  bool isFromCreator = false;

  // Real event state (BlockTiks MVP backend).
  final RxMap<String, dynamic> event = <String, dynamic>{}.obs;
  final RxMap<String, int> tierCounts = <String, int>{}.obs;
  final RxBool isLoading = false.obs;
  final Rxn<String> loadError = Rxn<String>();
  String? eventId;

  bool get hasEvent => event.isNotEmpty;

  List<Map<String, dynamic>> get tiers {
    final t = event['tiers'];
    if (t is! List) return const [];
    return t
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  /// Selected tiers as [{tierId, tierName, quantity, priceCents}].
  List<Map<String, dynamic>> get selectedTiers {
    final out = <Map<String, dynamic>>[];
    for (final tier in tiers) {
      final id = tier['id']?.toString() ?? '';
      final qty = tierCounts[id] ?? 0;
      if (qty <= 0) continue;
      out.add({
        'tierId': id,
        'tierName': tier['name']?.toString() ?? '',
        'quantity': qty,
        'priceCents': tier['priceCents'] ??
            ((tier['price'] as num?)?.toDouble() != null
                ? ((tier['price'] as num) * 100).round()
                : 0),
      });
    }
    return out;
  }

  // ---------- seated venue ----------

  final RxString selectedSectionId = ''.obs;
  final RxInt sectionCount = 0.obs;

  List<Map<String, dynamic>> get venueSections {
    final v = event['venueSections'];
    if (v is! List) return const [];
    return v
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  bool get isSeated => hasEvent && venueSections.isNotEmpty;

  Map<String, dynamic>? get selectedSection {
    for (final s in venueSections) {
      if (s['id']?.toString() == selectedSectionId.value) return s;
    }
    return null;
  }

  int sectionRemaining(Map<String, dynamic> section) {
    final rem = section['remaining'];
    if (rem is num) return rem.toInt();
    final cap = section['capacity'];
    final avail = section['available'];
    if (avail is num) return avail.toInt();
    if (cap is num) return cap.toInt();
    return 999;
  }

  void selectSection(String id) {
    if (selectedSectionId.value == id) {
      selectedSectionId.value = '';
      sectionCount.value = 0;
      return;
    }
    selectedSectionId.value = id;
    final section = venueSections.firstWhere(
      (s) => s['id']?.toString() == id,
      orElse: () => const {},
    );
    final max = sectionRemaining(section);
    sectionCount.value = sectionCount.value == 0 && max > 0 ? 1 : sectionCount.value;
    if (sectionCount.value > max) sectionCount.value = max.clamp(0, 8);
  }

  void adjustSectionCount(int delta) {
    final section = selectedSection;
    if (section == null) return;
    final max = sectionRemaining(section).clamp(0, 8);
    final next = (sectionCount.value + delta).clamp(0, max);
    sectionCount.value = next;
  }

  int get selectedCount =>
      isSeated ? sectionCount.value : selectedTiers.fold(0, (sum, t) => sum + (t['quantity'] as int));

  /// Subtotal in dollars across all selected tiers (real or legacy counters).
  double get subtotalDollars {
    if (isSeated) {
      final s = selectedSection;
      if (s == null) return 0;
      final cents = s['priceCents'];
      final price = cents is num
          ? cents.toDouble()
          : ((s['price'] as num?)?.toDouble() ?? 0) * 100;
      return price * sectionCount.value / 100;
    }
    if (hasEvent) {
      var cents = 0;
      for (final t in selectedTiers) {
        cents += (t['priceCents'] as int) * (t['quantity'] as int);
      }
      return cents / 100;
    }
    return (platinumCount.value +
            goldCount.value +
            silverCount.value +
            bronzeCount.value) *
        405;
  }

  // Resale listings for this event (official + resale in one flow).
  final RxList<Map<String, dynamic>> resaleListings =
      <Map<String, dynamic>>[].obs;

  @override
  void onInit() {
    var data = Get.arguments;
    if (data != null) {
      if (data is Map) {
        if (data[Constants.paramCreator] != null) {
          isFromCreator = data[Constants.paramCreator];
        }
        final id = data['id'] ?? data['eventId'];
        if (id != null && id.toString().isNotEmpty) {
          eventId = id.toString();
        }
      } else if (data is String && data.isNotEmpty) {
        eventId = data;
      }
    }
    super.onInit();
    if (eventId != null) {
      fetchEvent();
    }
  }

  Future<void> fetchEvent() async {
    final id = eventId;
    if (id == null) return;
    isLoading.value = true;
    loadError.value = null;
    try {
      event.value = await ApiService.event(id);
      // Seed tier counts so Obx counters have entries.
      for (final t in tiers) {
        final tid = t['id']?.toString() ?? '';
        if (tid.isNotEmpty && !tierCounts.containsKey(tid)) {
          tierCounts[tid] = 0;
        }
      }
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
    _fetchResaleListings();
  }

  Future<void> _fetchResaleListings() async {
    final id = eventId;
    if (id == null) return;
    try {
      resaleListings.value = await ApiService.activeListings(eventId: id);
    } catch (_) {
      // Resale is additive — never block the official ticket flow.
      resaleListings.value = const [];
    }
  }

  int tierRemaining(Map<String, dynamic> tier) {
    final rem = tier['remaining'];
    if (rem is num) return rem.toInt();
    final qty = tier['quantity'];
    final sold = tier['sold'];
    if (qty is num) {
      return (qty.toInt() - (sold is num ? sold.toInt() : 0)).clamp(0, 999);
    }
    return 999;
  }

  void adjustTier(String tierId, int delta, int max) {
    final current = tierCounts[tierId] ?? 0;
    final next = (current + delta).clamp(0, max > 10 ? 10 : max);
    tierCounts[tierId] = next;
    if (next == 0) tierCounts.remove(tierId);
  }

  // ---------- display helpers (reactive reads inside Obx) ----------

  String get titleText => event['title']?.toString() ?? '';
  String get categoryText => event['category']?.toString() ?? '';
  String get descriptionText => event['description']?.toString() ?? '';
  String get startsAtText => event['startsAt']?.toString() ?? '';
  String get locationText {
    final loc = event['location']?.toString() ?? '';
    final addr = event['address']?.toString() ?? '';
    if (addr.isNotEmpty && loc.isNotEmpty) return '$loc, $addr';
    return loc.isNotEmpty ? loc : addr;
  }

  String get formattedDate => formatEventDate(startsAtText);

  /// Arguments forwarded to the payment/checkout screen.
  Map<String, dynamic> paymentArguments() {
    if (hasEvent && isSeated) {
      final s = selectedSection ?? {};
      return {
        'eventId': eventId ?? event['id']?.toString() ?? '',
        'title': titleText,
        'type': 'Seated',
        'sectionId': s['id']?.toString() ?? '',
        'sectionName': s['name']?.toString() ?? '',
        'quantity': sectionCount.value,
        'subtotalCents': (subtotalDollars * 100).round(),
        'date': formattedDate,
        'venue': locationText,
        'imageUrl': event['imageUrl']?.toString() ?? '',
      };
    }
    if (hasEvent) {
      return {
        'eventId': eventId ?? event['id']?.toString() ?? '',
        'title': titleText,
        'type': categoryText.isNotEmpty ? categoryText : 'Event',
        'selections': selectedTiers,
        'subtotalCents': (subtotalDollars * 100).round(),
        'date': formattedDate,
        'venue': locationText,
        'imageUrl': event['imageUrl']?.toString() ?? '',
      };
    }
    // Legacy fallback (no event loaded): keep the old tier-count map.
    return {
      'platinum': platinumCount.value,
      'gold': goldCount.value,
      'silver': silverCount.value,
      'bronze': bronzeCount.value,
      'title': 'DJ Maksmellow Orignawa',
      'type': 'Music Concert',
    };
  }
}
