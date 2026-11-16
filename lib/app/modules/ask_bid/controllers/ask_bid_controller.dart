import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

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

  int get priceCents {
    final dollars = double.tryParse(priceController.text.trim());
    if (dollars == null || dollars <= 0) return 0;
    return (dollars * 100).round();
  }

  bool get canList => selectedCount > 0 && priceCents > 0 && !isListing.value;

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
