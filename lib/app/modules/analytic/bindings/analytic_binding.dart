import 'package:get/get.dart';

import '../controllers/analytic_controller.dart';

class AnalyticBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AnalyticController>(
      () => AnalyticController(),
    );
  }
}
