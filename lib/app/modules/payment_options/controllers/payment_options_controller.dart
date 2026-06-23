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
  Rx<PagingController<int, Cards>> pagingController =
      PagingController<int, Cards>(firstPageKey: 1).obs;
  final Rx<int> selectedIndex = (-1).obs;

  // Zipcode? zipcode;
  String? package;
  String packagePrice = "";
  String? title;
  String? webUrl;
  String? imgUrl;
  // late final Future<PaymentConfiguration> googlePayConfigFuture;

  RxBool isLoading = false.obs;

}
