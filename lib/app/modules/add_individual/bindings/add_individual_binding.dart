import 'package:get/get.dart';

import '../controllers/add_individual_controller.dart';

class AddIndividualBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AddIndividualController>(
      () => AddIndividualController(),
    );
  }
}
