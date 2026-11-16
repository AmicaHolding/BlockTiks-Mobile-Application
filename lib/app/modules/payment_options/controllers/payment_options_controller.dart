import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
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
      final res = await ApiService.paymentMethodSetupIntent();
      final clientSecret = res['clientSecret']?.toString() ?? '';
      if (clientSecret.isEmpty) {
        throw Exception('Missing Stripe setup details');
      }
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          merchantDisplayName: 'Sahra',
          setupIntentClientSecret: clientSecret,
          style: ThemeMode.dark,
        ),
      );
      await Stripe.instance.presentPaymentSheet();
      CustomSnackBar.showCustomSnackBar(
          title: 'Card saved', message: 'Your payment method was added.');
      await fetch();
    } on StripeException catch (e) {
      if (e.error.code != FailureCode.Canceled) {
        CustomSnackBar.showCustomErrorToast(
            message: e.error.message ?? 'Card setup failed');
      }
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isAdding.value = false;
    }
  }
}
