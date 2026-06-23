import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/all_guests_controller.dart';

class AllGuestsView extends GetView<AllGuestsController> {
  const AllGuestsView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      bodyPadding: true,
      sidePadding: false,
      screenName: "Guest List",
      centerTitle: true,
      showLogo: false,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: false,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: getPadding(top: 16,bottom: 16),
              child: SearchField(
                // onTap: () => Get.toNamed(Routes.SEARCH),
                // readOnly: true,
              ),
            ),
            SizedBox(height: getSize(20),),
            SizedBox(
              height: 30, // Set a fixed height for the ListView
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: controller.filter.length,
                itemBuilder: (context, index) {
                  return GestureDetector(
                      onTap: (){
                        controller.selectedFilter.value = index;
                        controller.filterItems();
                      },
                      child: Obx(()=> Container(
                        margin: getMargin(right: 5),
                        width: getSize(110),
                        padding: getPadding(left: 8,right: 8,top: 5,bottom: 5),
                        decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                                color:  controller.selectedFilter.value == index? Colors.transparent : ColorConstant.grayBorder
                            ),
                            color:  controller.selectedFilter.value == index ? ColorConstant.primaryPink : Colors.transparent
                        ),
                        alignment: Alignment.center,
                        child: MyText(
                          title: controller.filter[index],
                          fontSize: 10,
                          customWeight: FontWeight.bold,
                        ),
                      ),)
                  );
                },
              ),
            ),
            SizedBox(height: getSize(20),),
            Obx(() => ListView.builder(
              scrollDirection: Axis.vertical,
              itemCount: controller.guests.length,
              physics: NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              itemBuilder: (_, index) {
                final item = controller.guests[index];
                return allGuestTileWidget(item);
              },
            )),
            SizedBox(height: getSize(30),),
          ],
        ),
      ),
    );
  }

  Widget allGuestTileWidget(DummyGuestModel item){
    return GestureDetector(
      onTap: (){
        Get.toNamed(Routes.OTHER_USER_PROFILE);
      },
      child: Container(
        padding: getPadding(left: 15, right: 15, top: 10, bottom: 10),
        margin: getMargin(bottom: 15),
        decoration: BoxDecoration(
            color: ColorConstant.whiteA700.withOpacity(0.05),
            borderRadius: BorderRadius.circular(10)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CustomImageView(
                  imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
                  width: 38,
                  height: 38,
                  radius: BorderRadius.circular(getSize(30)),
                ),
                const SizedBox(
                  width: 15,
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    MyText(
                      title: item.name,
                      fontSize: 16,
                      customWeight: FontWeight.w500,
                    ),
                    MyText(
                      title: 'Order # 2353',
                      fontSize: 12,
                      customWeight: FontWeight.w800,
                      clr: ColorConstant.textGrey,
                    ),
                  ],
                ),
                const Spacer(),
                Container(
                  width: 80,
                  height: 25,
                  decoration: BoxDecoration(
                    color: item.isCheckedIn? ColorConstant.greenButton : Colors.red,
                    border: Border.all(
                      color: ColorConstant.grayBorder
                    ),
                    borderRadius: BorderRadius.circular(10)
                  ),
                  alignment: Alignment.center,
                  child: MyText(title: item.isCheckedIn ? "Checked In" : "Not Checked In",fontSize: 8,clr: item.isCheckedIn? ColorConstant.white60 : ColorConstant.whiteA700,),
                ),
              ],
            ),
            SizedBox(height: getSize(5),),
            MyText(title: "Purchased on Feb 21, 2023 · General Admission",fontSize: 12,clr: ColorConstant.textGrey,customWeight: FontWeight.bold,),
          ],
        ),
      ),
    );

  }
}
