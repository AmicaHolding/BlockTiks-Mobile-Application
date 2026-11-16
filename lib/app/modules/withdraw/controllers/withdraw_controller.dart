import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class WithdrawController extends GetxController {
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();
  final RxInt availableCents = 0.obs;
  final RxList<Map<String, dynamic>> soldListings =
      <Map<String, dynamic>>[].obs;

  bool fromDeposit = false;

  bool get canWithdraw => availableCents.value > 0 && !isLoading.value;

  @override
  void onInit() {
    super.onInit();
    final data = Get.arguments;
    if (data is Map && data[Constants.paramDeposit] != null) {
      fromDeposit = data[Constants.paramDeposit] == true;
    }
    load();
  }

  Future<void> load() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final listings = await ApiService.myListings();
      soldListings.value =
          listings.where((l) => l['status']?.toString() == 'SOLD').toList();
      availableCents.value = soldListings.fold<int>(
        0,
        (sum, l) => sum + ((l['priceCents'] as num?)?.toInt() ?? 0),
      );
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  void withdraw() {
    if (!canWithdraw) {
      CustomSnackBar.showCustomErrorToast(message: 'No available earnings');
      return;
    }
    CustomSnackBar.showCustomErrorToast(
        message:
            'Payouts are not connected yet. Resale earnings are tracked from sold listings.');
  }
}
