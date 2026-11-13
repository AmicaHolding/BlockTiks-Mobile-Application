import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/model/ticket_model.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/media_selection_tile.dart';
import 'package:block_tix/app/modules/create_event/controllers/create_event_controller.dart';
import 'package:get/get.dart';

class AddDropController extends GetxController {
  RxString selectedTime = "".obs;
  RxString selectedEndTime = "".obs;

  RxBool isTicketAddClick = false.obs;

  RxList<TicketModel> ticketTypes = <TicketModel>[].obs;

  GlobalKey<FormState> formKey = GlobalKey();

  TextEditingController dropName = TextEditingController();
  TextEditingController nameController = TextEditingController();
  TextEditingController priceController = TextEditingController();
  TextEditingController quantityController = TextEditingController();
  TextEditingController reserveController = TextEditingController();


  void showDetailDialog(BuildContext context){
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.0),
        ),
        child: Container(
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16.0),
              color: ColorConstant.bg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                color: ColorConstant.bg,
                padding: const EdgeInsets.only(top: 8.0),
                margin: const EdgeInsets.only(bottom: 0),
                child: Padding(
                  padding: const EdgeInsets.only(
                      top: 10.0, left: 16, right: 16, bottom: 10),
                  child: Row(
                    crossAxisAlignment:
                    CrossAxisAlignment.center,
                    mainAxisSize: MainAxisSize.max,
                    children: [
                      GestureDetector(
                        onTap: () {
                          Get.back();
                        },
                        child: Container(
                          height:getSize(30),
                          width:getSize(30),
                          margin: getMargin(right: 10),
                          decoration: BoxDecoration(
                              color: ColorConstant.elevated,
                              borderRadius: BorderRadius.circular(8)
                          ),
                          alignment: Alignment.center,
                          child: Padding(
                            padding: getPadding(left: 8),
                            child: Icon(Icons.arrow_back_ios,
                              color: ColorConstant.whiteA700,
                              size: 18,
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                          child: MyText(
                            title: 'Reserve Tickets',
                            family: 'Manrope',
                            customWeight: FontWeight.w700,
                            fontSize: 18,
                            clr: ColorConstant.whiteA700,
                          )
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: getPadding(left: 16,right: 16,top: 20,bottom: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      height: getSize(20),
                    ),

                    MyText(
                      title:'Save tickets to send to guests of yur choice. Once you have saved your event, visit the event page to send tickets to whoever you want',
                      customWeight: FontWeight.w400,
                      fontSize: 14,
                      clr: ColorConstant.whiteA700,
                    ),

                    SizedBox(
                      height: getSize(20),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Validates the ticket form, stores the new [TicketModel] locally and —
  /// when this screen was opened from the create-event flow — also appends it
  /// to [CreateEventController.tiers] so it is included in the
  /// `ApiService.createEvent` payload.
  void addTicket() {
    if (!(formKey.currentState?.validate() ?? false)) return;
    if (selectedTime.value.isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: "Please select date first");
      return;
    }
    final ticket = TicketModel(
      id: DateTime.now().millisecondsSinceEpoch,
      name: nameController.text.trim(),
      price: num.tryParse(priceController.text) ?? 0,
      quantity: int.tryParse(quantityController.text) ?? 0,
      reserveTickets: int.tryParse(reserveController.text) ?? 0,
      date: selectedTime.value,
    );
    ticketTypes.add(ticket);
    ticketTypes.refresh();

    if (Get.isRegistered<CreateEventController>()) {
      Get.find<CreateEventController>().tiers.add(ticket);
    }

    isTicketAddClick.value = false;
    nameController.clear();
    priceController.clear();
    quantityController.clear();
    reserveController.clear();
    selectedTime.value = "";
    selectedEndTime.value = "";
  }

  showSheet(BuildContext ctx) {
    showModalBottomSheet(
      context: ctx,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(14),
            topRight: Radius.circular(14),
          )),
      backgroundColor: Colors.transparent,
      builder: (BuildContext bc) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                decoration: BoxDecoration(
                    color: ColorConstant.elevated,
                    borderRadius: BorderRadius.circular(
                      14,
                    )),
                padding: getPadding(left: 16, right: 16, top: 15),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    MyText(
                      title: "Make changes to this action".tr,
                      clr: ColorConstant.whiteA700,
                      fontSize: getFontSize(16),
                      customWeight: FontWeight.w600,
                    ),
                    SizedBox(
                      height: getVerticalSize(5),
                    ),
                    MyText(
                      title: "Are you sure you want to make a change".tr,
                      clr: ColorConstant.white60,
                      fontSize: getFontSize(14),
                      customWeight: FontWeight.w400,
                    ),
                    SizedBox(
                      height: getVerticalSize(10),
                    ),
                    const CustomDivider(),
                    GestureDetector(
                      onTap: (){
                        Get.back();
                      },
                      child: Container(
                        width: size.width,
                        padding: getPadding(top: 10, bottom: 10),
                        alignment: Alignment.center,
                        child: MyText(
                          title: "Edit",
                          clr: ColorConstant.primaryAccent,
                          fontSize: getFontSize(14),
                          customWeight: FontWeight.w400,
                        ),
                      ),
                    ),
                    const CustomDivider(),
                    GestureDetector(
                      onTap: ()=> Get.back(),
                      child: Container(
                        width: size.width,
                        padding: getPadding(top: 10, bottom: 15),
                        alignment: Alignment.center,
                        child: MyText(
                          title: "Delete",
                          clr: ColorConstant.errorRed,
                          fontSize: getFontSize(14),
                          customWeight: FontWeight.w400,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: getVerticalSize(20),
              ),
              MediaSelectionTileAndroid(
                  title: "Cancel".tr,
                  textColor: ColorConstant.bg,
                  onPressed: () {
                    Get.back();
                  }),
              SizedBox(
                height: getVerticalSize(20),
              ),
            ],
          ),
        );
      },
    );
  }
}
