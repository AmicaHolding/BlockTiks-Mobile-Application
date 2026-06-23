import 'package:get/get.dart';

import '../controllers/upcoming_event_controller.dart';

class UpcomingEventBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<UpcomingEventController>(
      () => UpcomingEventController(),
    );
  }
}
