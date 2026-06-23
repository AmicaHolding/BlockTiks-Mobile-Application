import 'package:get/get.dart';

import '../controllers/creator_event_controller.dart';

class CreatorEventBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<CreatorEventController>(
      () => CreatorEventController(),
    );
  }
}
