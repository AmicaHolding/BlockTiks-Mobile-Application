import 'package:get/get.dart';

import '../controllers/my_scanner_controller.dart';

class MyScannerBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<MyScannerController>(
      () => MyScannerController(),
    );
  }
}
