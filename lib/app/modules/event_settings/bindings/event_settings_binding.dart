import 'package:get/get.dart';

import '../controllers/event_settings_controller.dart';

class EventSettingsBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<EventSettingsController>(
      () => EventSettingsController(),
    );
  }
}
