import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';

class WithdrawController extends GetxController {

  final GlobalKey<FormState> formKey = GlobalKey<FormState>();

  bool fromDeposit = false;

  @override
  void onInit() {
    var data = Get.arguments;
    if(data!= null && data[Constants.paramDeposit]!= null){
      fromDeposit = data[Constants.paramDeposit];
    }
    super.onInit();

  }
}
