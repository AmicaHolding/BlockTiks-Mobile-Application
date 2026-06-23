import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';

class EventDetailController extends GetxController {
  RxInt platinumCount = 0.obs;
  RxInt goldCount = 0.obs;
  RxInt silverCount = 0.obs;
  RxInt bronzeCount = 0.obs;

  bool isFromCreator = false;

  @override
  void onInit() {
    var data = Get.arguments;
    if(data != null && data[Constants.paramCreator] != null){
      isFromCreator = data[Constants.paramCreator];
    }
    super.onInit();

  }

}
