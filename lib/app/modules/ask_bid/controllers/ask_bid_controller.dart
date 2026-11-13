import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';

class AskBidController extends GetxController {
  RxInt selectedBid = (-1).obs;

  TextEditingController bidController = TextEditingController();
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();
  // Bumped on every keystroke so Obx widgets recompute the subtotal.
  final RxInt priceVersion = 0.obs;

  bool fromSell = false;

  // Event context — populated from route arguments when provided.
  String eventTitle = 'DJ Maksmellow Orignawa';
  String eventType = 'Music Concert';
  String ticketTier = '';

  // Prices shown on the three quick-select offer cards.
  static const List<double> offerPrices = [222, 232, 280];

  /// Price backing the current selection: the quick-pick card when one is
  /// selected, otherwise the manually entered amount (0 when invalid/empty).
  double get currentPrice {
    if (selectedBid.value >= 0 && selectedBid.value < offerPrices.length) {
      return offerPrices[selectedBid.value];
    }
    return double.tryParse(bidController.text.trim()) ?? 0;
  }

  /// Validates manual price entry. Quick-pick selections always pass.
  String? validatePrice(String? value) {
    if (selectedBid.value != -1) return null;
    final text = (value ?? '').trim();
    if (text.isEmpty) return 'Enter a price or pick an option';
    final parsed = double.tryParse(text);
    if (parsed == null || parsed <= 0) return 'Enter a valid amount';
    return null;
  }

  bool validateForm() {
    return formKey.currentState?.validate() ?? false;
  }

  @override
  void onInit() {
    super.onInit();
    bidController.addListener(() => priceVersion.value++);
    var data = Get.arguments;
    if (data is Map) {
      fromSell = data['fromSell'] == true || data['sell'] == true;
      if (data['title'] != null) eventTitle = data['title'].toString();
      if (data['type'] != null) eventType = data['type'].toString();
      if (data['tier'] != null) ticketTier = data['tier'].toString();
    } else if (data != null) {
      fromSell = data == true;
    }
  }

  @override
  void onClose() {
    bidController.dispose();
    super.onClose();
  }
}
