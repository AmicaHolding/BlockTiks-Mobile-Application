import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class PlaceBidController extends GetxController {
  String eventId = '';
  String eventTitle = 'Event';
  String eventType = 'Event';
  String eventTier = 'Ticket';
  int faceCents = 0;
  int capCents = 0;
  String currency = 'usd';

  final RxInt quantity = 1.obs;
  final RxInt maxPriceCents = 0.obs;
  final RxList<Map<String, dynamic>> listings = <Map<String, dynamic>>[].obs;
  final RxBool isLoading = false.obs;
  final Rxn<String> loadError = Rxn<String>();

  int get totalCents => maxPriceCents.value * quantity.value;

  String money(num? cents) => formatMoney(cents, currency);

  List<Map<String, dynamic>> get marketListings {
    if (eventTier.isEmpty || eventTier == 'Ticket') return listings;
    final matched =
        listings.where((l) => l['tierName']?.toString() == eventTier).toList();
    return matched.isEmpty ? listings : matched;
  }

  int? get lowestAskCents {
    final prices = marketListings
        .map((l) => l['priceCents'])
        .whereType<num>()
        .map((n) => n.toInt())
        .toList();
    if (prices.isEmpty) return null;
    prices.sort();
    return prices.first;
  }

  @override
  void onInit() {
    super.onInit();
    final data = Get.arguments;
    if (data is Map) {
      eventId = (data['eventId'] ?? data['id'])?.toString() ?? '';
      eventTitle = data['title']?.toString() ??
          data['eventTitle']?.toString() ??
          'Event';
      eventType =
          data['type']?.toString() ?? data['category']?.toString() ?? 'Event';
      eventTier = data['tier']?.toString() ??
          data['ticketType']?.toString() ??
          'Ticket';
      faceCents =
          _cents(data['faceCents'] ?? data['priceCents'], data['price']);
      capCents = _cents(data['capCents'], null);
      final cur = data['currency']?.toString();
      if (cur != null && cur.isNotEmpty) currency = cur.toLowerCase();
    }
    if (capCents <= 0 && faceCents > 0) {
      capCents = (faceCents * 1.2).round();
    }
    if (maxPriceCents.value <= 0) {
      maxPriceCents.value =
          capCents > 0 ? capCents : (faceCents > 0 ? faceCents : 10000);
    }
    load();
  }

  int _cents(dynamic centsValue, dynamic priceValue) {
    if (centsValue is num) return centsValue.toInt();
    if (priceValue is num) return (priceValue * 100).round();
    return 0;
  }

  Future<void> load() async {
    if (eventId.isEmpty) {
      listings.value = const [];
      return;
    }
    isLoading.value = true;
    loadError.value = null;
    try {
      listings.value = await ApiService.activeListings(eventId: eventId);
      for (final l in listings) {
        final c = l['currency']?.toString();
        if (c != null && c.isNotEmpty) {
          currency = c.toLowerCase();
          break;
        }
      }
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  void changeQuantity(int delta) {
    quantity.value = (quantity.value + delta).clamp(1, 10);
  }

  void changePrice(int deltaCents) {
    final next = maxPriceCents.value + deltaCents;
    if (next < 100) return;
    if (capCents > 0 && next > capCents * 2) return;
    maxPriceCents.value = next;
  }

  Future<void> setPrice() async {
    if (eventId.isEmpty || maxPriceCents.value <= 0 || quantity.value <= 0) {
      CustomSnackBar.showCustomErrorToast(message: 'Set a valid price');
      return;
    }
    isLoading.value = true;
    try {
      await ApiService.createOffer(
        eventId: eventId,
        tierName: eventTier,
        maxPriceCents: maxPriceCents.value,
        quantity: quantity.value,
      );
      CustomSnackBar.showCustomSnackBar(
        title: 'Offer set',
        message: 'We will match you when a listing hits your price.',
      );
      Get.back();
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isLoading.value = false;
    }
  }
}
