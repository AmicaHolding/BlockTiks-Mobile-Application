import 'package:block_tix/app/data/core/app_export.dart';

class TransferController extends GetxController {

  RxInt selectedUser = (-1).obs;
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();
  TextEditingController toController = TextEditingController();

  // Ticket context — populated from route arguments when provided.
  String ticketTitle = 'Cyberpunk';
  String ticketType = 'Platinum';
  String ticketDate = '15/6/24';

  @override
  void onInit() {
    super.onInit();
    var data = Get.arguments;
    if (data is Map) {
      if (data['title'] != null) ticketTitle = data['title'].toString();
      if (data['type'] != null) ticketType = data['type'].toString();
      if (data['date'] != null) ticketDate = data['date'].toString();
    }
  }

  @override
  void onClose() {
    toController.dispose();
    super.onClose();
  }
}
