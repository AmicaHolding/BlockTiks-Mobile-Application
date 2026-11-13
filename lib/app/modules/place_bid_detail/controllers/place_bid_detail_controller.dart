import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';

class PlaceBidDetailController extends GetxController {
  final List<String> ticketType = [
    "Platinum Ticket",
    "Gold Ticket",
    "Silver Ticket",
    "Bronze Ticket",
  ];

  List<int> numbers = List<int>.generate(10, (index) => index);

  RxString selectedType = "Platinum Ticket".obs;
  RxInt quantity = 0.obs;

  final GlobalKey<FormState> formKey = GlobalKey<FormState>();
  TextEditingController priceController = TextEditingController();
  // Bumped on every price keystroke so Obx widgets recompute the subtotal.
  final RxInt priceVersion = 0.obs;

  // Event context — populated from route arguments when provided.
  String eventTitle = 'DJ Maksmellow Orignawa';
  String eventType = 'Music Concert';

  /// Per-unit price used for the subtotal. Falls back to the lowest ask
  /// when the user has not typed a custom price.
  static const Map<String, double> tierPrices = {
    "Platinum Ticket": 440,
    "Gold Ticket": 330,
    "Silver Ticket": 220,
    "Bronze Ticket": 110,
  };

  double get unitPrice {
    final text = priceController.text.trim();
    if (text.isNotEmpty) {
      final parsed = double.tryParse(text);
      if (parsed != null && parsed > 0) return parsed;
    }
    return tierPrices[selectedType.value] ?? 280;
  }

  double get subtotal => unitPrice * (quantity.value > 0 ? quantity.value : 1);

  bool validateForm() {
    final priceOk =
        priceController.text.trim().isEmpty ||
            (double.tryParse(priceController.text.trim()) ?? 0) > 0;
    return priceOk && quantity.value > 0 && selectedType.value.isNotEmpty;
  }

  @override
  void onInit() {
    super.onInit();
    priceController.addListener(() => priceVersion.value++);
    var data = Get.arguments;
    if (data is Map) {
      if (data['title'] != null) eventTitle = data['title'].toString();
      if (data['type'] != null) eventType = data['type'].toString();
      if (data['ticketType'] != null &&
          ticketType.contains(data['ticketType'].toString())) {
        selectedType.value = data['ticketType'].toString();
      }
      if (data['quantity'] is int &&
          numbers.contains(data['quantity'])) {
        quantity.value = data['quantity'];
      }
    }
  }

  @override
  void onClose() {
    priceController.dispose();
    super.onClose();
  }
}
