import 'package:get/get.dart';

import '../controllers/host_org_controller.dart';

class HostOrgBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<HostOrgController>(() => HostOrgController());
  }
}
