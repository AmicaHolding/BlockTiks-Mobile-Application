import 'package:block_tix/app/data/core/app_export.dart';

class PurchasedTicketController extends GetxController {

  int tickets = 1;
  List<RxBool> rxBoolList = [false.obs];
  bool showBack = false;

  @override
  void onInit() {
    var data = Get.arguments;
    if(data!= null && data[Constants.paramShowBack] != null){
      showBack = data[Constants.paramShowBack];
    }
    if(data!= null && data[Constants.paramTicket] != null ){
      tickets = data[Constants.paramTicket];
      rxBoolList = List.generate(tickets, (index) => false.obs);
    }

    super.onInit();
  }
}
