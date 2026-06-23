import 'package:get/get.dart';

import '../controllers/set_date_controller.dart';

class SetDateBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<SetDateController>(
      () => SetDateController(),
    );
  }
}
