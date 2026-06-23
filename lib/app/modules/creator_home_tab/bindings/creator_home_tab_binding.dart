import 'package:get/get.dart';

import '../controllers/creator_home_tab_controller.dart';

class CreatorHomeTabBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<CreatorHomeTabController>(
      () => CreatorHomeTabController(),
    );
  }
}
