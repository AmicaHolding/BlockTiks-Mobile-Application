import 'package:block_tix/app/data/core/app_export.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/remind_me_controller.dart';

class RemindMeView extends GetView<RemindMeController> {
  const RemindMeView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      showLogo: false,
      basicAppBar: false,
      showBackBtn: false,
      sidePadding: false,
      bodyPadding: false,
      showNotification: false,
      bottomNavigationBar: SafeArea(
        child: CustomButton(
          text: "Back to home".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            Get.offAllNamed(Routes.USER_DASHBOARD);
          },
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Expanded(flex: 2,child: Container()),
          CustomImageView(
            imagePath: ImageConstant.logo,
            fit: BoxFit.fitWidth,
            width: getSize(250),
          ),
          Container(
            margin: getPadding(top: 50),
            child: MyText(
              title: 'We will remind you\nonce the event is live',
                customWeight: FontWeight.w400,
                fontSize: 16,
                center: true,
                // height: 1.3,
                // letterSpacing: -0.8,
                clr: ColorConstant.white60,
            ),
          ),
          Expanded(flex: 1,child: Container()),
        ],
      ),
    );
  }
}
