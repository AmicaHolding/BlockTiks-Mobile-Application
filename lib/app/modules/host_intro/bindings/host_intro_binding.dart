import 'package:get/get.dart';

import '../controllers/host_intro_controller.dart';

class HostIntroBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<HostIntroController>(() => HostIntroController());
  }
}
