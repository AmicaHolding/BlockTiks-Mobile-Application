import 'package:get/get.dart';

import '../controllers/ask_bid_controller.dart';

class AskBidBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AskBidController>(
      () => AskBidController(),
    );
  }
}
