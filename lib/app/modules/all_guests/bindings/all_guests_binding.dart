import 'package:get/get.dart';

import '../controllers/all_guests_controller.dart';

class AllGuestsBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AllGuestsController>(
      () => AllGuestsController(),
    );
  }
}
