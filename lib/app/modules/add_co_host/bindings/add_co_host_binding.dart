import 'package:get/get.dart';

import '../controllers/add_co_host_controller.dart';

class AddCoHostBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AddCoHostController>(
      () => AddCoHostController(),
    );
  }
}
