import 'package:get/get.dart';

import '../controllers/creator_promo_code_controller.dart';

class CreatorPromoCodeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<CreatorPromoCodeController>(
      () => CreatorPromoCodeController(),
    );
  }
}
