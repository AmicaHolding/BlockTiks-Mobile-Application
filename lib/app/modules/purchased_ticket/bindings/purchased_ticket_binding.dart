import 'package:get/get.dart';

import '../controllers/purchased_ticket_controller.dart';

class PurchasedTicketBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<PurchasedTicketController>(
      () => PurchasedTicketController(),
    );
  }
}
