import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';

class AskBidController extends GetxController {
  RxInt selectedBid = (-1).obs;

  TextEditingController bidController = TextEditingController();

  bool fromSell = false;

  @override
  void onInit() {
    // TODO: implement onInit
    super.onInit();
    var data = Get.arguments;
    if(data!= null){
      fromSell = data;
    }
  }
}
