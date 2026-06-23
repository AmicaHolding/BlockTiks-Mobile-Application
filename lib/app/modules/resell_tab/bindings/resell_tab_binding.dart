import 'package:get/get.dart';

import '../controllers/resell_tab_controller.dart';

class ResellTabBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ResellTabController>(
      () => ResellTabController(),
    );
  }
}
