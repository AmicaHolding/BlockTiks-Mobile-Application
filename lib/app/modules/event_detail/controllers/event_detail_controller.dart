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

  int get selectedCount =>
      selectedTiers.fold(0, (sum, t) => sum + (t['quantity'] as int));

  /// Subtotal in dollars across all selected tiers (real or legacy counters).
  double get subtotalDollars {
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
