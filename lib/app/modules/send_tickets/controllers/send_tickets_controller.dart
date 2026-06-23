import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';

class SendTicketsController extends GetxController {
  RxInt selectedUser = (-1).obs;
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();

  // Sample ticket data
  final List<Map<String, dynamic>> tickets = [
    {'name': 'Platinum', 'image': 'assets/platinum_ticket.jpg', 'quantity': null},
    {'name': 'Gold', 'image': 'assets/gold_ticket.jpg', 'quantity': 4},
  ];
}
