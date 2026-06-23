import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:get/get.dart';

class AllGuestsController extends GetxController {

  List<String> filter = [
    'All',
    'Checked In',
    'Not Checked In',
  ];

  RxInt selectedFilter = 0.obs;

  RxList<DummyGuestModel> guests = DummyContent.guests.obs;

  void filterItems() {
    switch (selectedFilter.value){
      case 0:
        guests.value = DummyContent.guests;
        return;
      case 1:
        guests.value = DummyContent.guests.where((guest) => guest.isCheckedIn).toList();
        return;
      case 2:
        guests.value = DummyContent.guests.where((guest) => !guest.isCheckedIn).toList();
        return;
      default:
        return;
    }
  }
}
