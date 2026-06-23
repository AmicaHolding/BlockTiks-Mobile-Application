import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/widgets/media_selection_tile.dart';
import 'package:block_tix/app/modules/create_event/controllers/create_event_controller.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/creator_event_controller.dart';

class CreatorEventView extends GetView<CreatorEventController> {
  const CreatorEventView({Key? key}) : super(key: key);
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
      actions: [
        GestureDetector(
          onTap: (){
            Get.toNamed(Routes.CREATE_EVENT,arguments: {Constants.paramEdit : true});
          },
          child: MyText(title: 'Edit',
            fontSize: 18,
            customWeight: FontWeight.bold,
          ),
        ),
      ],
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: getSize(20),),
            Row(
              children: [
                MyText(title: 'Cyberpunk',
                  fontSize: 29,
                  customWeight: FontWeight.bold,
                ),
                SizedBox(width: getSize(15),),
                Container(
                  width: getSize(16),
                  height: getSize(16),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: ColorConstant.greenActive
                  ),
                ),
                Spacer(),
                GestureDetector(
                  onTap: (){
                    Get.toNamed(Routes.EVENT_DETAIL,arguments: {Constants.paramCreator:true});
                  },
                  child: Container(
                    padding: getPadding(left: 8,right: 8,top: 5,bottom: 5),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: ColorConstant.grayBorder
                      )
                    ),
                    child: MyText(
                      title: "Preview Event",
                      fontSize: 8,
                      customWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: getSize(30),),
            CustomButton(
              onTap: (){
                Get.toNamed(Routes.MY_SCANNER);
              },
              text: "Check in People",
              prefixWidget: CustomImageView(
                svgPath: ImageConstant.scanner,
                height: getSize(21),
                margin: getMargin(right: 10),
              ),
            ),
            SizedBox(height: getSize(30),),
            MyText(title: 'Analytics',fontSize: 18,customWeight: FontWeight.w600,),
            SizedBox(height: getSize(15),),
            Row(
              children: [
                Expanded(
                  child: _userWidget("Tickets Sold","231","32",),
                ),
                Expanded(
                  child: _userWidget("Total Sales","1400","32",showUSD: true),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                MyText(title: 'Broadcast Messages',fontSize: 18,customWeight: FontWeight.w600,),
                GestureDetector(
                  onTap: (){
                    Get.toNamed(Routes.BROADCAST_MESSAGE)!.then((value){
                      if(value != null){
                        controller.broadcastMessages.add(DummyBroadcastModel(message: value['message'], name: value['name']));
                        controller.broadcastMessages.refresh();
                      }
                    });
                  },
                  child: Icon(
                    Icons.add,
                    color: ColorConstant.whiteA700,
                  ),
                )
              ],
            ),
            SizedBox(height: getSize(15),),
            Obx(() => ListView.builder(
              scrollDirection: Axis.vertical,
              itemCount: controller.broadcastMessages.length,
              physics: NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              itemBuilder: (_, index) {
                final item = controller.broadcastMessages[index];
                return GuestTile(
                  name: item.name,
                  message: item.message,
                  index: index,
                );
              },
            )),
            SizedBox(height: getSize(15),),
            Row(
              children: [
                MyText(title: 'Guest List',fontSize: 18,customWeight: FontWeight.w600,),
                Spacer(),
                GestureDetector(
                  onTap: (){
                    Get.toNamed(Routes.SEND_TICKETS);
                  },
                  child: Container(
                    padding: getPadding(left: 8,right: 8,top: 5,bottom: 5),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: ColorConstant.grayBorder
                        )
                    ),
                    child: MyText(
                      title: "+ send reserved tickets",
                      fontSize: 8,
                      customWeight: FontWeight.bold,
                    ),
                  ),
                ),
                SizedBox(width: getSize(20),),
                GestureDetector(
                  onTap: (){
                    Get.toNamed(Routes.ALL_GUESTS);
                  },
                  child: Container(
                    padding: getPadding(left: 8,right: 8,top: 5,bottom: 5),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: ColorConstant.grayBorder
                        )
                    ),
                    child: MyText(
                      title: "View All",
                      fontSize: 8,
                      customWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: getSize(10),),
            MyText(title: '80 Guests',fontSize: 16,customWeight: FontWeight.w400,),
            SizedBox(height: getSize(15),),
            SizedBox(
              height: 50, // Set a fixed height for the ListView
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: 5, // Adding 1 for the "+76 others" item
                itemBuilder: (context, index) {
                  if (index < 4) {
                    // Display image items
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4.0),
                      child:  CustomImageView(
                        imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
                        width: 50,
                        height: 50,
                        radius: BorderRadius.circular(30),
                        onTap: (){
                          Get.toNamed(Routes.OTHER_USER_PROFILE);
                        },
                      ),
                    );
                  } else {
                    // Display the "+76 others" item
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4.0),
                      child: Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          color: ColorConstant.grayBorder,
                          borderRadius: BorderRadius.circular(50),
                        ),
                        child: Center(
                          child: MyText(
                            title: '+76',
                            fontSize: 16,
                            customWeight: FontWeight.bold,
                            clr: ColorConstant.whiteA700,
                          ),
                        ),
                      ),
                    );
                  }
                },
              ),
            ),SizedBox(height: getSize(15),),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                MyText(title: 'Team',fontSize: 18,customWeight: FontWeight.w600,),
                GestureDetector(
                  onTap: (){
                    Get.toNamed(Routes.MANAGE_TEAMS);
                  },
                  child: Container(
                    padding: getPadding(left: 8,right: 8,top: 5,bottom: 5),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: ColorConstant.grayBorder
                        )
                    ),
                    child: MyText(
                      title: "Edit team",
                      fontSize: 8,
                      customWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: getSize(10),),
            MyText(title: '3 Members',fontSize: 16,customWeight: FontWeight.w400,),
            SizedBox(height: getSize(15),),
            SizedBox(
              height: 50, // Set a fixed height for the ListView
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: 3, // Adding 1 for the "+76 others" item
                itemBuilder: (context, index) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4.0),
                    child:  CustomImageView(
                      imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
                      width: 50,
                      height: 50,
                      radius: BorderRadius.circular(30),
                      onTap: (){
                        Get.toNamed(Routes.OTHER_USER_PROFILE);
                      },
                    ),
                  );
                },
              ),
            ),
            SizedBox(height: getSize(30),),
          ],
        ),
      ),
    );
  }

  Widget _userWidget(String title,String amount,String progress,
      {bool showUSD = false, bool decline = false}){
    return Padding(
      padding: getPadding( bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(
            height: 5,
          ),
          MyText(title: title,fontSize: 14,),
          const SizedBox(
            height: 3,
          ),
          MyText(
            title: "${showUSD ? "\$" : ""}$amount",
            fontSize: 28,
            customWeight: FontWeight.w800,
          ),
          const SizedBox(
            height: 5,
          ),
          Row(
            children: [
              MyText(
                title: "This week",
                clr: ColorConstant.white60,
              ),
              const SizedBox(
                width: 5,
              ),
              MyText(
                title: "${decline ? "-" : "+"}$progress%",
                clr: decline ? ColorConstant.red : ColorConstant.green,
              ),
            ],
          ),
          const SizedBox(
            height: 10,
          ),
        ],
      ),
    );

  }
}

class GuestTile extends StatelessWidget {
  GuestTile(
      {super.key, required this.name,required this.message,required this.index, this.onTap});

  final String name;
  final String message;
  final int index;
  final void Function()? onTap;

  final controller = Get.put(CreatorEventController());

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        showEditBroadcastSheet(context);
      },
      child: Container(
        padding: getPadding(left: 15, right: 15, top: 10, bottom: 10),
        margin: getMargin(bottom: 15),
        decoration: BoxDecoration(
            color: ColorConstant.whiteA700.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            CustomImageView(
              imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
              width: 40,
              height: 40,
              radius: BorderRadius.circular(30),
              onTap: (){
                Get.toNamed(Routes.OTHER_USER_PROFILE);
              },
            ),
            const SizedBox(
              width: 15,
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText(
                    title: message,
                    fontSize: 16,
                    customWeight: FontWeight.w600,
                    line: 1,
                    toverflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: getSize(3),),
                  MyText(
                    title: name,
                    fontSize: 12,
                    clr: ColorConstant.white60,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void showEditBroadcastSheet(BuildContext context){
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
                    title: "Edit".tr,
                    onPressed: () {
                      Get.back();
                      Get.toNamed(Routes.BROADCAST_MESSAGE,arguments: {Constants.paramEdit: true});
                    }),
                SizedBox(
                  height: getVerticalSize(20),
                ),
                MediaSelectionTileAndroid(
                    title: "Delete".tr,
                    onPressed: () {
                      Get.back();
                      controller.broadcastMessages.removeAt(index);
                      controller.broadcastMessages.refresh();
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
}
