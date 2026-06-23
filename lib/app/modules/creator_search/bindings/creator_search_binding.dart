import 'package:get/get.dart';

import '../controllers/creator_search_controller.dart';

class CreatorSearchBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<CreatorSearchController>(
      () => CreatorSearchController(),
    );
  }
}
