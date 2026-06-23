import 'package:get/get.dart';

import '../controllers/add_team_controller.dart';

class AddTeamBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AddTeamController>(
      () => AddTeamController(),
    );
  }
}
