import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class EventSettingsController extends GetxController {
  RxBool paidByUser = false.obs;
  RxBool paidFromProfit = false.obs;
  RxBool allowResale = false.obs;
  RxBool resaleLimits = false.obs;

  /// Event id passed via `Get.arguments['id']` (or `Constants.paramId`).
  /// When empty the publish action is unavailable.
  RxString eventId = ''.obs;
  RxBool isPublishing = false.obs;

  @override
  void onInit() {
    super.onInit();
    final args = Get.arguments;
    if (args is Map) {
      final id = args['id'];
      if (id != null) eventId.value = id.toString();
    }
  }

  /// Publishes the draft event via `POST /events/:id/publish`.
  Future<void> publishEvent() async {
    if (isPublishing.value) return;
    if (eventId.value.isEmpty) {
      CustomSnackBar.showCustomErrorToast(
          message: "Save the event first before publishing");
      return;
    }
    isPublishing.value = true;
    try {
      await ApiService.publishEvent(eventId.value);
      CustomSnackBar.showCustomToast(message: "Event published");
      Get.back(result: {'published': true});
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(message: e.toString());
    } finally {
      isPublishing.value = false;
    }
  }



  num resalePriceLimit = 100.0;
  num ticketsX = 0;
  num ticketsY = 0;
  num royalties = 0.0;


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
                            title: 'Ticket Protection',
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
                      height: getSize(10),
                    ),

                    MyText(
                      title:'To guard against abuse of your inventory, take measures to limit suspicious actors. Limit the maximum someone can resell your ticket for. And set limits for how many tickets someone can buy within a given timeframe. For the latter, you must fill out both fields to activate.',
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


}
