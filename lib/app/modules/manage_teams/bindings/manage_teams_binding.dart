import 'package:get/get.dart';

import '../controllers/manage_teams_controller.dart';

class ManageTeamsBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ManageTeamsController>(
      () => ManageTeamsController(),
    );
  }
}
