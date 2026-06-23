import 'package:get/get.dart';

import '../controllers/send_tickets_controller.dart';

class SendTicketsBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<SendTicketsController>(
      () => SendTicketsController(),
    );
  }
}
