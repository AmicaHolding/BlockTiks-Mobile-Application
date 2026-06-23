import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';

class PaymentPageController extends GetxController {
  RxInt selectedPayment = 0.obs;

  int platinum = 0;
  int gold = 0;
  int silver = 0;
  int bronze = 0;

  bool fromPlaceBid = false;

  @override
  void onInit() {
    super.onInit();
    var data = Get.arguments;
    if(data != null && data[Constants.paramPlaceBid] != null) fromPlaceBid = data[Constants.paramPlaceBid];
    if(data != null && data['platinum'] != null) platinum = data['platinum'];
    if(data != null && data['gold'] != null) gold = data['gold'];
    if(data != null && data['silver'] != null) silver = data['silver'];
    if(data != null && data['bronze'] != null) bronze = data['bronze'];
  }

}
