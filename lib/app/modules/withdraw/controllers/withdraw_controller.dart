import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class WithdrawController extends GetxController {
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();
  final RxInt readyCents = 0.obs;
  final RxInt pendingCents = 0.obs;
  final RxInt lifetimeCents = 0.obs;
  final RxList<Map<String, dynamic>> sales = <Map<String, dynamic>>[].obs;
  final RxBool isWithdrawing = false.obs;

  bool get canWithdraw =>
      readyCents.value > 0 && !isLoading.value && !isWithdrawing.value;

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final res = await ApiService.earnings();
      readyCents.value = (res['readyCents'] as num?)?.toInt() ?? 0;
      pendingCents.value = (res['pendingCents'] as num?)?.toInt() ?? 0;
      lifetimeCents.value = (res['lifetimeCents'] as num?)?.toInt() ?? 0;
      final list = (res['sales'] as List?) ?? [];
      sales.value = list
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  String aed(int cents) => 'AED ${(cents / 100).toStringAsFixed(2)}';

  Future<void> withdraw() async {
    if (!canWithdraw) return;
    isWithdrawing.value = true;
    try {
      await ApiService.withdraw(readyCents.value);
      CustomSnackBar.showCustomSnackBar(
          title: 'Withdrawal requested',
          message: 'Payout will be sent once payout accounts are connected.');
      await load();
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isWithdrawing.value = false;
    }
  }

  String dateLabel(String? iso) {
    final dt = DateTime.tryParse(iso ?? '');
    if (dt == null) return '';
    final local = dt.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }
}
