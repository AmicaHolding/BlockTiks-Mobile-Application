import 'dart:io';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/file_upload_helper.dart';
import 'package:block_tix/app/data/utils/permission_manager.dart';
import 'package:block_tix/app/data/widgets/media_selection_tile.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

class BroadcastMessageController extends GetxController {

  TextEditingController messageController = TextEditingController();

  Rx<File> image = File("").obs;

  List<String> ticketHolders = [
    'Premium Holders',
    'Gold Holders',
    'Silver Holders',
    'Bronze Holders',
  ];

  List<RxBool> ticketChecks = [
    false.obs,
    false.obs,
    false.obs,
    false.obs,
  ];

  @override
  void onInit() {
    var data = Get.arguments;
    if(data != null && data[Constants.paramEdit]!= null){
      messageController.text = "This event is going to be the best event of my life.";
      ticketChecks = [
        true.obs,
        false.obs,
        true.obs,
        false.obs,
      ];
    }
    super.onInit();

  }



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
                        clr: ColorConstant.blueGray400,
                        fontSize: getFontSize(14),
                        customWeight: FontWeight.w400,
                      ),
                    ),
                    SizedBox(
                      width: size.width,
                      child: Center(
                        child: MyText(
                          title: "lbl_select_option".tr,
                          clr: ColorConstant.blueGray900,
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
}
