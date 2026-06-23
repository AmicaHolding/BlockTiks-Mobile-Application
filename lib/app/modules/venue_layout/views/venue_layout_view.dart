import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/venue_layout_controller.dart';

class VenueLayoutView extends GetView<VenueLayoutController> {
  const VenueLayoutView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      showLogo: false,
      basicAppBar: false,
      screenName: "Venue Layout",
      centerTitle: true,
      showBackBtn: true,
      sidePadding: false,
      bodyPadding: true,
      showNotification: false,
      extendBodyBehindAppBar: true,
      bottomNavigationBar: SafeArea(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            CustomButton(
              width: 120,
              text: "lbl_save".tr,
              margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
              shape: ButtonShape.RoundedBorder10,
              onTap: () {
                if(controller.image.value.path.isNotEmpty){
                  Get.back();
                }else{
                  CustomSnackBar.showCustomErrorToast(message: "Please select venue image first.");
                }

              },
            ),
          ],
        ),
      ),
      child: SingleChildScrollView(
        child:
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: getSize(30),),
            MyText(
                title: "You can upload an image to show venue layout.",
              fontSize: 16,
              clr: ColorConstant.white60,
            ),
            SizedBox(height: getSize(30),),
            Obx(() => CustomImageView(
              file: controller.image.value,
              imagePath: ImageConstant.addLayout,
              height: size.height * 0.3,
              fit: BoxFit.fill,
              width: size.width,
              radius: BorderRadius.circular(5),
              margin: getMargin(bottom: 20),
              onTap: (){
                controller.mediaSelectionBottomSheetAndroid(context);
              },
            ),),
          ],
        ),
      ),
    );
  }
}
