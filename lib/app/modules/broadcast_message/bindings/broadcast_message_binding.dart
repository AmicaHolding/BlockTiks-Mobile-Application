import 'package:get/get.dart';

import '../controllers/broadcast_message_controller.dart';

class BroadcastMessageBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<BroadcastMessageController>(
      () => BroadcastMessageController(),
    );
  }
}
