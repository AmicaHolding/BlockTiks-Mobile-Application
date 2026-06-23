import 'package:block_tix/app/modules/splash/controllers/splash_controller.dart';
import 'package:get/get.dart';

class InitialBindings extends Bindings {
  @override
  void dependencies() {
    Get.put(SplashController());
  }
}
