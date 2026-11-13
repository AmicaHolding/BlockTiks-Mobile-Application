import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class CreatorEventController extends GetxController {
  RxList<DummyBroadcastModel> broadcastMessages = DummyContent.broadcastMessages.obs;

  /// Title of the event being managed. Populated from GetX arguments
  /// (`arguments['title']`) when navigating from the creator home tab,
  /// falling back to a placeholder so the screen never shows stale data.
  RxString eventTitle = 'Cyberpunk'.obs;

  /// Event id from `arguments['id']`; when present the real event (with
  /// tiers) is fetched from `GET /events/:id`.
  RxString eventId = ''.obs;

  RxBool isLoading = false.obs;
  Rxn<String> loadError = Rxn<String>();

  /// Real stats derived from the event's ticket tiers.
  RxInt ticketsSold = 0.obs;
  RxDouble revenue = 0.0.obs;
  RxInt goingCount = 0.obs;
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
      final event = await ApiService.event(eventId.value);
      if (event['title'] != null) {
        eventTitle.value = event['title'].toString();
      }
      eventStatus.value = (event['status']?.toString() ?? '').toUpperCase();

      final tiers = (event['tiers'] as List?) ?? [];
      var sold = 0;
      var revenueCents = 0;
      for (final t in tiers) {
        if (t is! Map) continue;
        final tierSold = (t['sold'] as num?)?.toInt() ?? 0;
        sold += tierSold;
        final priceCents = (t['priceCents'] as num?)?.toInt() ??
            (((t['price'] as num?) ?? 0) * 100).round();
        revenueCents += tierSold * priceCents;
      }
      ticketsSold.value = sold;
      revenue.value = revenueCents / 100;
      goingCount.value = sold;
    } catch (e) {
      loadError.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

  /// "$1,234" style formatting for the revenue stat.
  String get revenueLabel {
    final rounded = revenue.value.round();
    final digits = rounded.abs().toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
      buffer.write(digits[i]);
    }
    return '${revenue.value < 0 ? '-' : ''}\$${buffer.toString()}';
  }
}
