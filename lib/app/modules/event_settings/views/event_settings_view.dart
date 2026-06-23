import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/widgets/custom_switch.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/event_settings_controller.dart';

class EventSettingsView extends GetView<EventSettingsController> {
  const EventSettingsView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      showLogo: false,
      basicAppBar: false,
      screenName: "Event Settings",
      centerTitle: true,
      showBackBtn: true,
      sidePadding: false,
      bodyPadding: true,
      showNotification: false,
      resizeToAvoidBottomInset: true,
      child: SingleChildScrollView(
        physics: BouncingScrollPhysics(),
        child:
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: getSize(30),),
            MyText(
              title: "Fees",
              fontSize: 18,
              clr: ColorConstant.whiteA700,
              customWeight: FontWeight.bold,
            ),
            MyText(
              title: "Choose to pay 3% by adding to ticket price or by taking it out from the venue profit",
              fontSize: 16,
              clr: ColorConstant.white60,
            ),
            SizedBox(height: getSize(30),),

            Obx(() => settingWidget(
              title: "Paid by User",
              switchVal: controller.paidByUser.value,
              onChanged: (val) {
                controller.paidByUser.value =
                !controller.paidByUser.value;
              },
            )),
            // Obx(() => settingWidget(
            //   title: "Paid from Profit",
            //   switchVal: controller.paidFromProfit.value,
            //   onChanged: (val) {
            //     controller.paidFromProfit.value =
            //     !controller.paidFromProfit.value;
            //   },
            // )),


            SizedBox(height: getSize(20),),
            MyText(
              title: "Aftermarket",
              fontSize: 18,
              clr: ColorConstant.whiteA700,
              customWeight: FontWeight.bold,
            ),
            MyText(
              title: "Select if resale is allowed or not",
              fontSize: 16,
              clr: ColorConstant.white60,
            ),
            SizedBox(height: getSize(30),),
            Obx(() => settingWidget(
              title: "Allow Resale",
              switchVal: controller.allowResale.value,
              onChanged: (val) {
                controller.allowResale.value =
                !controller.allowResale.value;
              },
            )),
            Obx(() => Visibility(
              visible: controller.allowResale.value,
              child: settingWidget(
                title: "Resale Limits",
                switchVal: controller.resaleLimits.value,
                onChanged: (val) {
                  controller.resaleLimits.value =
                  !controller.resaleLimits.value;
                },
              ),
            )),
            Obx(() => Visibility(
              visible: controller.resaleLimits.value,
              child:Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    margin: getMargin(top: 15,bottom: 16),
                    padding: getPadding(all: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: ColorConstant.grayBorder),
                      borderRadius: BorderRadius.circular(getSize(10)),
                      color: ColorConstant.whiteA700.withValues(alpha: 0.15)
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [

                        Row(
                          children: [
                            MyText(
                              title: 'Ticket protection:',
                              fontSize: 16,
                              customWeight: FontWeight.bold,
                            ),
                            SizedBox(width: getSize(20),),
                            GestureDetector(
                              onTap: (){
                                controller.showDetailDialog(context);
                              },
                              child: Icon(Icons.info_outline_rounded,color: ColorConstant.whiteA700,),
                            )
                          ],
                        ),
                        SizedBox(height: getSize(15),),
                        Row(
                          children: [
                            RichText(
                                text: TextSpan(children: [
                                  TextSpan(
                                      text: "Resale price limit ".tr,
                                      style: AppStyle.white60InterNormal14.copyWith(fontSize: getFontSize(16))),
                                  TextSpan(
                                      text: "(Optional)".tr,
                                      style: AppStyle.white60InterNormal14.copyWith(color: ColorConstant.white60.withValues(alpha: .3))),
                                ]),
                                textAlign: TextAlign.left),
                            Spacer(),
                            SizedBox(
                              width: 100,
                              child: Container(
                                padding: getPadding(left: 16, ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.3),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: TextField(
                                  style: GoogleFonts.getFont("Inter",
                                      fontSize: 16, color: ColorConstant.whiteA700),
                                  onChanged: (val){
                                    controller.resalePriceLimit = num.parse(val);
                                  },
                                  keyboardType: TextInputType.number,
                                  textInputAction: TextInputAction.done,
                                  decoration: InputDecoration(
                                    suffixIcon: Padding(
                                      padding: getPadding(top: 8),
                                      child: MyText(title: '\$',fontSize: 18,customWeight: FontWeight.bold,),
                                    ),
                                    hintText: "",
                                    hintStyle: const TextStyle(color: Colors.white70),
                                    border: InputBorder.none,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: getSize(15),),
                        RichText(
                            text: TextSpan(children: [
                              TextSpan(
                                  text: "Purchase limit".tr,
                                  style: AppStyle.white60InterNormal14.copyWith(fontSize: getFontSize(16))),
                              TextSpan(
                                  text: "(Optional)".tr,
                                  style: AppStyle.white60InterNormal14.copyWith(color: ColorConstant.white60.withValues(alpha: .3))),
                            ]),
                            textAlign: TextAlign.left),
                        SizedBox(height: getSize(15),),
                        Row(
                          children: [
                            MyText(
                              title: 'Users can buy',
                              clr: ColorConstant.white60,
                              customWeight: FontWeight.w500,
                              fontSize: 14,
                            ),
                            SizedBox(width: getSize(5),),
                            Container(
                              padding: getPadding(left: 12,right: 10 ),
                              width: 35,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.3),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: TextField(
                                style: GoogleFonts.getFont("Inter",
                                    fontSize: 16, color: ColorConstant.whiteA700),
                                onChanged: (val){
                                  controller.ticketsX = num.parse(val);
                                },
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  hintText: "X",
                                  hintStyle: const TextStyle(color: Colors.white70),
                                  border: InputBorder.none,
                                ),
                              ),
                            ),
                            SizedBox(width: getSize(5),),
                            MyText(
                              title: 'tickets every',
                              clr: ColorConstant.white60,
                              customWeight: FontWeight.w500,
                              fontSize: 14,
                            ),
                            SizedBox(width: getSize(5),),
                            Container(
                              width: 35,
                              padding: getPadding(left: 12,right: 10 ),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.3),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: TextField(
                                style: GoogleFonts.getFont("Inter",
                                    fontSize: 16, color: ColorConstant.whiteA700),
                                onChanged: (val){
                                  controller.ticketsY = num.parse(val);
                                },
                                textInputAction: TextInputAction.done,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  hintText: "Y",
                                  hintStyle: const TextStyle(color: Colors.white70),
                                  border: InputBorder.none,
                                ),
                              ),
                            ),
                            SizedBox(width: getSize(5),),
                            MyText(
                              title: 'minutes',
                              clr: ColorConstant.white60,
                              customWeight: FontWeight.w500,
                              fontSize: 14,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              )
            )),
            Row(
              children: [
                MyText(
                  title: 'Royalties',
                  clr: ColorConstant.white60,
                  customWeight: FontWeight.w500,
                  fontSize: 14,
                ),
                Spacer(),
                SizedBox(
                  width: 100,
                  child: Container(
                    padding: getPadding(left: 16, ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: TextField(
                      controller: TextEditingController(text: "0"),
                      style: GoogleFonts.getFont("Inter",
                          fontSize: 16, color: ColorConstant.whiteA700),
                      onChanged: (val){
                        controller.royalties = num.parse(val);
                      },
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        suffix: Padding(
                          padding: getPadding(right:10),
                          child: MyText(title: '%',fontSize: 18,customWeight: FontWeight.bold,),
                        ),
                        hintText: "0",
                        hintStyle: const TextStyle(color: Colors.white70),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget settingWidget(
      {required String title,
        bool isSwitch = true,
        bool switchVal = false,
        Function(bool)? onChanged,
        Widget? trailing}) {
    return Container(
      margin: getMargin(bottom: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          MyText(
            title: title ?? "",
            family: 'Manrope',
            clr: ColorConstant.white60,
            customWeight: FontWeight.w500,
            fontSize: 14,
          ),
          trailing ??
              (isSwitch
                  ? CustomSwitch(
                value: switchVal,
                onChanged: onChanged,
              )
                  : const Icon(
                Icons.arrow_forward_ios,
                color: Colors.white,
              ))
        ],
      ),
    );
  }
}
