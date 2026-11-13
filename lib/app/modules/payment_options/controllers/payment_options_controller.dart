import 'dart:convert';

import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
// import 'package:pay/pay.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/payment_options/model/card_model.dart';

class PaymentOptionsController extends GetxController {
  RxInt selectedPayment = 0.obs;

  bool isFromAds = false;
  int currentPage = 1;
  int totalPages = 0;
  final RxString selectedCard = "".obs;
  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();
  // v5 PagingController requires explicit fetch callbacks; this controller
  // never paginates, so they return an empty page.
  Rx<PagingController<int, Cards>> pagingController = PagingController<
          int,
          Cards>(
        getNextPageKey: (state) => null,
        fetchPage: (pageKey) async => const <Cards>[],
      ).obs;
  final Rx<int> selectedIndex = (-1).obs;

  // Zipcode? zipcode;
  String? package;
  String packagePrice = "";
  String? title;
  String? webUrl;
  String? imgUrl;
  // late final Future<PaymentConfiguration> googlePayConfigFuture;

  RxBool isLoading = false.obs;

  // Manual card entry form (shown when "Add Debit/Credit Card" is selected).
  final GlobalKey<FormState> cardFormKey = GlobalKey<FormState>();
  TextEditingController cardNumberController = TextEditingController();
  TextEditingController expiryController = TextEditingController();
  TextEditingController cvvController = TextEditingController();
  TextEditingController nameController = TextEditingController();

  /// Validates the manual card form before saving.
  bool validateCard() {
    return cardFormKey.currentState?.validate() ?? false;
  }

  @override
  void onClose() {
    cardNumberController.dispose();
    expiryController.dispose();
    cvvController.dispose();
    nameController.dispose();
    super.onClose();
  }
}
