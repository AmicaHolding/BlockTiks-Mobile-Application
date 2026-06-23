import 'package:get/get.dart';

import '../controllers/venue_layout_controller.dart';

class VenueLayoutBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<VenueLayoutController>(
      () => VenueLayoutController(),
    );
  }
}
