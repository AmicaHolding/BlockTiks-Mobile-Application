import 'package:get/get.dart';

import '../controllers/follow_following_controller.dart';

class FollowFollowingBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<FollowFollowingController>(
      () => FollowFollowingController(),
    );
  }
}
