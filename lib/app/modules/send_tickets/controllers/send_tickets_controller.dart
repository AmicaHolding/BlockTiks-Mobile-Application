import 'package:block_tix/app/data/core/app_export.dart';

class SendTicketsController extends GetxController {
  RxInt selectedUser = (-1).obs;
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();
  TextEditingController toController = TextEditingController();

  // Sample ticket data — may be overridden by route arguments.
  final List<Map<String, dynamic>> tickets = [
    {'name': 'Platinum', 'image': 'assets/platinum_ticket.jpg', 'quantity': null},
    {'name': 'Gold', 'image': 'assets/gold_ticket.jpg', 'quantity': 4},
  ];

  // Event/ticket context — populated from route arguments when provided.
  String eventTitle = '';

  @override
  void onInit() {
    super.onInit();
    var data = Get.arguments;
    if (data is Map) {
      if (data['title'] != null) eventTitle = data['title'].toString();
      if (data['tickets'] is List) {
        tickets
          ..clear()
          ..addAll((data['tickets'] as List).map((e) =>
              e is Map ? Map<String, dynamic>.from(e) : {'name': e.toString(), 'quantity': null}));
      }
    }
  }

  @override
  void onClose() {
    toController.dispose();
    super.onClose();
  }
}
