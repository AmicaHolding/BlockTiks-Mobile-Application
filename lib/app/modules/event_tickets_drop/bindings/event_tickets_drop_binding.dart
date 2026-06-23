import 'package:get/get.dart';

import '../controllers/event_tickets_drop_controller.dart';

class EventTicketsDropBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<EventTicketsDropController>(
      () => EventTicketsDropController(),
    );
  }
}
