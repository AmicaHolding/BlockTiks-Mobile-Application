import 'package:get/get.dart';

import '../controllers/add_drop_controller.dart';

class AddDropBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AddDropController>(
      () => AddDropController(),
    );
  }
}
