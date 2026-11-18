import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

class AskBidController extends GetxController {
  final RxList<Map<String, dynamic>> sellableTickets =
      <Map<String, dynamic>>[].obs;
  final RxList<Map<String, dynamic>> listings = <Map<String, dynamic>>[].obs;
  final RxList<String> selectedCodes = <String>[].obs;
  final RxBool isLoading = true.obs;
  final RxBool isListing = false.obs;
  final Rxn<String> loadError = Rxn<String>();
  final RxString eventTitle = ''.obs;

  final TextEditingController priceController = TextEditingController();
  final RxInt priceVersion = 0.obs;

  int get selectedCount => selectedCodes.length;

  /// Currency of the tickets being priced (from the sellable tickets API).
  String get currency {
    for (final t in sellableTickets) {
      final code = t['code']?.toString();
      if (selectedCodes.isNotEmpty &&
          code != null &&
          !selectedCodes.contains(code)) {
        continue;
      }
      final c = t['currency']?.toString();
      if (c != null && c.isNotEmpty) return c.toLowerCase();
    }
    return 'usd';
  }

  String money(num? cents) => formatMoney(cents, currency);

  int get priceCents {
    final dollars = double.tryParse(priceController.text.trim());
    if (dollars == null || dollars <= 0) return 0;
    return (dollars * 100).round();
  }

  /// Face value of a ticket in cents, when the API provides it.
  /// TODO(api-gap: my-tickets payload doesn't expose a canonical faceCents
  /// field, falls back to priceCents/paidCents)
  static int? faceCentsOf(Map<String, dynamic> ticket) {
    for (final key in ['faceCents', 'faceValueCents', 'priceCents', 'paidCents']) {
      final v = ticket[key];
      if (v is num && v > 0) return v.toInt();
    }
    return null;
  }

  /// Resale cap: face value × 1.10 (decision-8, organiser may lower but
  /// not raise). Uses the lowest face across selected tickets, since all
  /// are listed at the same price.
  int? get capCents {
    final selected = sellableTickets.where(
        (t) => selectedCodes.contains(t['code']?.toString()));
    int? lowest;
    for (final t in selected) {
      final face = faceCentsOf(t);
      if (face == null) continue;
      if (lowest == null || face < lowest) lowest = face;
    }
    return lowest == null ? null : (lowest * 110 / 100).floor();
  }

  bool get overCap => capCents != null && priceCents > capCents!;

  /// Seller payout: 95% of the ask (decision-7, the 5% seller fee funds
  /// the organiser royalty; Sahra earns from the separate 5% buyer fee).
  int get netCents => (priceCents * 95 / 100).round();

  bool get canList =>
      selectedCount > 0 && priceCents > 0 && !overCap && !isListing.value;

  bool isSelected(String code) => selectedCodes.contains(code);

  void toggleTicket(String code) {
    if (selectedCodes.contains(code)) {
      selectedCodes.remove(code);
    } else {
      selectedCodes.add(code);
    }
  }

  @override
  void onInit() {
    super.onInit();
    priceController.addListener(() => priceVersion.value++);
    final data = Get.arguments;
    if (data is Map) {
      final title = data['title']?.toString();
      if (title != null && title.isNotEmpty) eventTitle.value = title;
      final code = (data['ticketCode'] ?? data['code'])?.toString();
      if (code != null && code.isNotEmpty) {
        Future.microtask(() async {
          await load();
          if (sellableTickets.any((t) => t['code']?.toString() == code)) {
            if (!selectedCodes.contains(code)) selectedCodes.add(code);
          }
        });
        return;
      }
    }
    load();
  }

  Future<void> load() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final results = await Future.wait([
        ApiService.sellableTickets(),
        ApiService.myListings(),
      ]);
      sellableTickets.value = results[0];
      listings.value = results[1];
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> listSelected() async {
    if (!canList) return;
    if (overCap) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Price is over the resale cap (110% of face value)');
      return;
    }
    isListing.value = true;
    var listed = 0;
    try {
      for (final code in List<String>.from(selectedCodes)) {
        await ApiService.createListing(code, priceCents);
        listed++;
      }
      selectedCodes.clear();
      priceController.clear();
      await load();
      CustomSnackBar.showCustomToast(
          message: listed == 1
              ? 'Ticket listed for sale'
              : '$listed tickets listed');
    } catch (e) {
      await load();
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isListing.value = false;
    }
  }

  Future<void> cancelListing(Map<String, dynamic> listing) async {
    final code =
        listing['ticketCode']?.toString() ?? listing['code']?.toString() ?? '';
    if (code.isEmpty) return;
    try {
      await ApiService.cancelListing(code);
      await load();
      CustomSnackBar.showCustomToast(message: 'Listing cancelled');
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }

  @override
  void onClose() {
    priceController.dispose();
    super.onClose();
  }
}
