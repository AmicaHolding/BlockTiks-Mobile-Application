import 'package:get/get.dart';

class PlaceBidDetailController extends GetxController {
  final List<String> ticketType = [
    "Platinum Ticket",
    "Gold Ticket",
    "Silver Ticket",
    "Bronze Ticket",
  ];

  List<int> numbers = List<int>.generate(10, (index) => index);

  RxString selectedType = "Platinum Ticket".obs;
  RxInt quantity = 0.obs;
}
