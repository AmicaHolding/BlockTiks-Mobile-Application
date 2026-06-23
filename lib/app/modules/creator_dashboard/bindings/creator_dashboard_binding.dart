import 'package:get/get.dart';

import '../controllers/creator_dashboard_controller.dart';

class CreatorDashboardBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<CreatorDashboardController>(
      () => CreatorDashboardController(),
    );
  }
}
