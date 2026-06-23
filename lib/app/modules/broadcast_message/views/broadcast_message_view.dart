import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/broadcast_message_controller.dart';

class BroadcastMessageView extends GetView<BroadcastMessageController> {
  const BroadcastMessageView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      bodyPadding: true,
      sidePadding: false,
      showLogo: false,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: false,
      bottomNavigationBar: SafeArea(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            CustomButton(
              width: getSize(120),
              text: "lbl_save".tr,
              margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
              shape: ButtonShape.RoundedBorder10,
              onTap: () {
                if(controller.messageController.text.trim().isNotEmpty){
                  Get.back(result: {
                    "name": "123 Music",
                    "message": controller.messageController.text
                  });
                }else{
                  CustomSnackBar.showCustomErrorToast(message: "Please type message first");
                }

              },
            ),
          ],
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: getSize(20),),
            MyText(title: 'To',
              fontSize: 18,
              customWeight: FontWeight.bold,
            ),
            SizedBox(height: getSize(15),),
            SizedBox(
              height: 30, // Set a fixed height for the ListView
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: controller.ticketHolders.length,
                itemBuilder: (context, index) {
                  return GestureDetector(
                    onTap: (){
                      controller.ticketChecks[index].value = !controller.ticketChecks[index].value;
                    },
                    child: Obx(()=> Container(
                      margin: getMargin(right: 5),
                      padding: getPadding(left: 8,right: 8,top: 5,bottom: 5),
                      decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: controller.ticketChecks[index].value? Colors.transparent : ColorConstant.grayBorder
                          ),
                          color: controller.ticketChecks[index].value ? ColorConstant.primaryPink : Colors.transparent
                      ),
                      child: MyText(
                        title: controller.ticketHolders[index],
                        fontSize: 10,
                        customWeight: FontWeight.bold,
                      ),
                    ),)
                  );
                },
              ),
            ),
            SizedBox(height: getSize(30),),
            MyText(title: 'Message',
              fontSize: 18,
              customWeight: FontWeight.bold,
            ),
            SizedBox(height: getSize(15),),
            Container(
              padding: getPadding(left: 16, right: 16,top: 5,bottom: 5),
              margin: getMargin(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: TextField(
                controller: controller.messageController,
                // onTap: onTap,
                style: GoogleFonts.getFont("Inter",
                    fontSize: 16, color: ColorConstant.whiteA700),
                maxLines: 6,
                decoration: InputDecoration(
                  contentPadding: getPadding(
                    right: getSize(15),
                  ),
                  hintText:  "Add your message",
                  hintStyle: TextStyle(color: ColorConstant.white60),
                  border: InputBorder.none,
                ),
              ),
            ),

            Obx(() => CustomImageView(
              onTap: ()=> controller.mediaSelectionBottomSheetAndroid(context),
              file: controller.image.value.path.isNotEmpty ? controller.image.value : null,
              svgPath:  controller.image.value.path.isNotEmpty ? null : ImageConstant.insertImage,
              height: getSize(115),
              width: getSize(115),
              radius: BorderRadius.circular(5),
              margin: getMargin(bottom: 20,top: 30),
            ),)
          ],
        ),
      ),
    );
  }
}
