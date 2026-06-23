import 'package:get/get.dart';

import '../controllers/remind_me_controller.dart';

class RemindMeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<RemindMeController>(
      () => RemindMeController(),
    );
  }
}
