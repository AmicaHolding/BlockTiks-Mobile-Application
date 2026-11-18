import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class CreatorEventController extends GetxController {
  RxString eventTitle = 'Untitled event'.obs;
  RxString eventId = ''.obs;
  RxBool isLoading = false.obs;
  Rxn<String> loadError = Rxn<String>();

  Rxn<Map<String, dynamic>> event = Rxn<Map<String, dynamic>>();
  RxList<Map<String, dynamic>> tiers = <Map<String, dynamic>>[].obs;
  RxInt ticketsSold = 0.obs;
  RxInt capacity = 0.obs;
  RxInt checkedIn = 0.obs;
  RxInt totalGuests = 0.obs;
  RxDouble revenue = 0.0.obs;
  RxString eventStatus = ''.obs;

  @override
  void onInit() {
    super.onInit();
    final args = Get.arguments;
    if (args is Map) {
      if (args['title'] != null) {
        eventTitle.value = args['title'].toString();
      }
      if (args['id'] != null) {
        eventId.value = args['id'].toString();
      }
    }
    if (eventId.value.isNotEmpty) {
      loadEvent();
    }
  }

  Future<void> loadEvent() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final fetched = await ApiService.event(eventId.value);
      event.value = fetched;
      eventTitle.value = fetched['title']?.toString() ?? eventTitle.value;
      eventStatus.value = (fetched['status']?.toString() ?? '').toUpperCase();

      final sections = (fetched['venueSections'] as List?) ?? [];
      final gaTiers = (fetched['tiers'] as List?) ?? [];
      final useSections = sections.isNotEmpty;
      final rows = useSections ? sections : gaTiers;
      tiers.assignAll(rows
          .whereType<Map>()
          .map((t) => Map<String, dynamic>.from(t))
          .toList());

      var sold = 0;
      var capacityTotal = 0;
      var revenueCents = 0;
      for (final row in tiers) {
        final quantity = _int(row['capacity'] ?? row['quantity']);
        final rowSold = _int(row['sold']);
        final priceCents = _int(row['priceCents']) != 0
            ? _int(row['priceCents'])
            : ((_num(row['price'])) * 100).round();
        capacityTotal += quantity;
        sold += rowSold;
        revenueCents += rowSold * priceCents;
      }
      ticketsSold.value = sold;
      capacity.value = capacityTotal;
      revenue.value = revenueCents / 100;

      try {
        final guests = await ApiService.eventGuests(eventId.value);
        checkedIn.value = _int(guests['checkedIn']);
        totalGuests.value = _int(guests['total']);
        if (totalGuests.value == 0) totalGuests.value = ticketsSold.value;
      } catch (_) {
        // Snapshot still works if the guest endpoint is unavailable.
        totalGuests.value = ticketsSold.value;
      }
    } catch (e) {
      loadError.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

  int _int(dynamic value) => value is num ? value.toInt() : 0;
  double _num(dynamic value) => value is num ? value.toDouble() : 0;

  String get venueLabel => event.value?['location']?.toString() ?? '';
  String get startsAtLabel => formatEventDate(
        event.value?['startsAt']?.toString(),
        tz: event.value?['venueTimezone']?.toString(),
        includeTime: true,
      );
  String get statusLabel => eventStatus.value.isEmpty
      ? '-'
      : eventStatus.value[0] + eventStatus.value.substring(1).toLowerCase();
  int get checkInPercent => capacity.value == 0
      ? 0
      : ((checkedIn.value / capacity.value) * 100).round();

  /// Event currency for tier price display (defaults to USD).
  String get currency {
    final c = event.value?['currency']?.toString();
    return (c == null || c.isEmpty) ? 'usd' : c.toLowerCase();
  }

  String moneyCents(num? cents) => formatMoney(cents, currency);
}
