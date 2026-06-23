import 'package:get/get.dart';

import '../controllers/place_bid_detail_controller.dart';

class PlaceBidDetailBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<PlaceBidDetailController>(
      () => PlaceBidDetailController(),
    );
  }
}
