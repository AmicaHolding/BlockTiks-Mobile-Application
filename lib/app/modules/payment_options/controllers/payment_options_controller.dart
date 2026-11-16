import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class PaymentOptionsController extends GetxController {
  final RxList<Map<String, dynamic>> methods = <Map<String, dynamic>>[].obs;
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();
  final RxBool isAdding = false.obs;

  @override
  void onInit() {
    super.onInit();
    fetch();
  }

  Future<void> fetch() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      methods.value = await ApiService.paymentMethods();
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> detach(String id) async {
    try {
      await ApiService.detachPaymentMethod(id);
      methods.removeWhere((m) => m['id'] == id);
      CustomSnackBar.showCustomSnackBar(
          title: 'Card removed', message: 'The saved card was detached.');
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> addCard() async {
    isAdding.value = true;
    try {
      await ApiService.paymentMethodSetupIntent();
      CustomSnackBar.showCustomSnackBar(
        title: 'Card setup started',
        message:
            'Stripe setup is ready; card entry will use the payment sheet when enabled.',
      );
      await fetch();
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isAdding.value = false;
    }
  }
}
