import 'dart:io';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/file_upload_helper.dart';
import 'package:block_tix/app/data/utils/model/ticket_model.dart';
import 'package:block_tix/app/data/utils/permission_manager.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/media_selection_tile.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:permission_handler/permission_handler.dart';

class CreateEventController extends GetxController {

  Rx<File> image = File("").obs;
  RxString selectedTime = "".obs;
  RxString selectedEndTime = "".obs;

  /// ISO-8601 start/end timestamps returned by the SET_DATE screen.
  RxString startsAtIso = "".obs;
  RxString endsAtIso = "".obs;

  /// Ticket tiers added through the ADD_DROP screen.
  RxList<TicketModel> tiers = <TicketModel>[].obs;

  /// Place name / address / link entered on the "Place name" tile.
  TextEditingController locationController = TextEditingController();

  RxBool isSubmitting = false.obs;


  RxBool isNowSelected = true.obs;

  final GlobalKey<FormState> formKey = GlobalKey<FormState>();

  TextEditingController eventNameController = TextEditingController(text: 'Untitled Event');
  TextEditingController eventDescController = TextEditingController();

  Future<void> mediaSelectionBottomSheetAndroid(context) async {
    await PermissionManager.askForPermission(Permission.camera);
    await PermissionManager.askForPermission(Permission.storage);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(14),
            topRight: Radius.circular(14),
          )),
      builder: (BuildContext bc) {
        return SafeArea(
          child: Container(
            padding: getPadding(left: 16, right: 16, top: 15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Stack(
                  children: [
                    GestureDetector(
                      onTap: () {
                        Get.back();
                      },
                      child: MyText(
                        title: "lbl_cancel".tr,
                        clr: ColorConstant.white60,
                        fontSize: getFontSize(14),
                        customWeight: FontWeight.w400,
                      ),
                    ),
                    SizedBox(
                      width: size.width,
                      child: Center(
                        child: MyText(
                          title: "lbl_select_option".tr,
                          clr: ColorConstant.whiteA700,
                          fontSize: getFontSize(16),
                          customWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(
                  height: getVerticalSize(20),
                ),
                MediaSelectionTileAndroid(
                    title: "lbl_take_picture".tr,
                    onPressed: () {
                      _pickImage(ImageSource.camera, context);
                    }),
                SizedBox(
                  height: getVerticalSize(20),
                ),
                MediaSelectionTileAndroid(
                    title: "lbl_upload_picture".tr,
                    onPressed: () {
                      _pickImage(ImageSource.gallery, context);
                    }),
                SizedBox(
                  height: getVerticalSize(20),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _pickImage(ImageSource imageSource, context) async {
    Navigator.pop(context);
    await PermissionManager.askForPermission(Permission.camera);
    await PermissionManager.askForPermission(Permission.storage);
    await FileManager().showModelSheetForImage(imageSource, context,
        getImages: (value) async {
          debugPrint("=========>$value");
          image.value = File(value[0].toString());
        });
  }


  @override
  void onInit() {
    var data = Get.arguments;
    if(data != null && data[Constants.paramEdit] != null){
      eventNameController.text = "DJ Orignawa";
      eventDescController.text = 'South Korean girl group Blackpink have embarked on two headlining concert tours. In July 2017, the group held their debut showcase in Japan.';
      selectedTime.value = DateFormat('EEE MMM d').format(DateTime.now());
    }
    super.onInit();

  }

  /// Validates the form and creates the event via [ApiService.createEvent].
  /// When "Publish now" is selected the draft is published immediately via
  /// [ApiService.publishEvent]. On success navigates to the creator event
  /// management screen for the newly created event.
  Future<void> submit() async {
    if (isSubmitting.value) return;
    if (!(formKey.currentState?.validate() ?? false)) return;

    if (startsAtIso.value.isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: "Please set a date for your event");
      return;
    }

    final validTiers = tiers
        .where((t) =>
            (t.name ?? '').trim().isNotEmpty &&
            (t.price ?? 0) > 0 &&
            (t.quantity ?? 0) > 0)
        .toList();
    if (validTiers.isEmpty) {
      CustomSnackBar.showCustomErrorToast(
          message: "Please add at least one ticket type with a price and quantity");
      return;
    }

    isSubmitting.value = true;
    try {
      final body = <String, dynamic>{
        'title': eventNameController.text.trim(),
        'description': eventDescController.text.trim(),
        'category': 'GENERAL',
        'startsAt': startsAtIso.value,
        'tiers': validTiers
            .map((t) => <String, dynamic>{
                  'name': t.name!.trim(),
                  'priceCents': ((t.price ?? 0) * 100).round(),
                  'quantity': t.quantity ?? 0,
                })
            .toList(),
      };
      if (endsAtIso.value.isNotEmpty) body['endsAt'] = endsAtIso.value;
      final location = locationController.text.trim();
      if (location.isNotEmpty) body['location'] = location;

      final created = await ApiService.createEvent(body);
      final id = created['id']?.toString() ?? '';

      if (isNowSelected.value && id.isNotEmpty) {
        try {
          await ApiService.publishEvent(id);
          CustomSnackBar.showCustomToast(message: "Event created and published");
        } catch (e) {
          CustomSnackBar.showCustomToast(
              message: "Event created as draft. Publish failed: $e");
        }
      } else {
        CustomSnackBar.showCustomToast(message: "Event created as draft");
      }

      if (id.isNotEmpty) {
        Get.offNamed(Routes.CREATOR_EVENT,
            arguments: {'id': id, 'title': eventNameController.text.trim()});
      } else {
        Get.back();
      }
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(message: e.toString());
    } finally {
      isSubmitting.value = false;
    }
  }

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
                            title: 'Publish date',
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
                      title:'If you select now then event will be published as soon as created. If you select later then event will be published at that time',
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
