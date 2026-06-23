import 'dart:ffi';
import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/modules/event_detail/views/event_detail_view.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/create_event_controller.dart';

class CreateEventView extends GetView<CreateEventController> {
  const CreateEventView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      showLogo: true,
      basicAppBar: false,
      showBackBtn: true,
      sidePadding: false,
      bodyPadding: true,
      showNotification: false,
      extendBodyBehindAppBar: true,
      bottomNavigationBar: SafeArea(
        child: CustomButton(
          text: "lbl_create".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            if(controller.formKey.currentState!.validate()){
              Get.back();
              CustomSnackBar.showCustomToast(message: "Event Created...!!!");
            }
          },
        ),
      ),
      child: SingleChildScrollView(
        child: Form(
          key: controller.formKey,
          child: Column(
            children: [
              Container(
                padding: getPadding(left: 16, right: 16),
                margin: getMargin(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: TextFormField(
                  controller: controller.eventNameController,
                  keyboardAppearance: Brightness.dark,
                  // onTap: onTap,
                  style: GoogleFonts.getFont("Inter",
                      fontSize: 16, color: ColorConstant.whiteA700),
                  // onChanged: onChanged,
                  // readOnly: readOnly,
                  textAlign: TextAlign.center,
                  decoration: InputDecoration(
                    contentPadding: getPadding(
                      right: getSize(15),
                    ),
                    hintText:  "Untitled Event",
                    hintStyle: const TextStyle(color: ColorConstant.whiteColor),
                    border: InputBorder.none,
                  ),
                  validator: (value) {
                    return HelperFunction.stringValidate(value);
                  },
                ),
              ),
              Obx(() => CustomImageView(
                file: controller.image.value,
                imagePath: ImageConstant.createEventCover,
                height: size.height * 0.3,
                fit: BoxFit.fill,
                width: size.width,
                radius: BorderRadius.circular(5),
                margin: getMargin(bottom: 20),
                onTap: (){
                  controller.mediaSelectionBottomSheetAndroid(context);
                },
              ),),
              GestureDetector(
                onTap: () async {
                  await Get.toNamed(Routes.SET_DATE)!.then((value) {
                    if(value!= null ){
                      controller.selectedTime.value = value["selectedTime"];
                      if(value["selectedEndTime"]!= null ){
                        controller.selectedEndTime.value = value["selectedEndTime"];
                      }
                    }

                  });

                },
                child: Container(
                  padding: getPadding(left: 16, right: 16,bottom: 12,top: 12),
                  margin: getMargin(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.centerLeft,
                  child:Obx(()=>  MyText(
                    title:controller.selectedTime.value.isEmpty ? "Set a date" : controller.selectedTime.value + (controller.selectedEndTime.value.isNotEmpty ? "\n${controller.selectedEndTime.value}":""),
                    family: "Inter",
                    fontSize: 16, clr: ColorConstant.whiteA700,
                  )),
                ),
              ),
              Container(
                padding: getPadding(left: 16, right: 16,top: 5,bottom: 5),
                margin: getMargin(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: TextFormField(
                  controller: controller.eventDescController,
                  keyboardAppearance: Brightness.dark,
                  // onTap: onTap,
                  style: GoogleFonts.getFont("Inter",
                      fontSize: 16, color: ColorConstant.whiteA700),
                  maxLines: 6,
                  decoration: InputDecoration(
                    contentPadding: getPadding(
                      right: getSize(15),
                    ),
                    hintText:  "Add a description for your event",
                    hintStyle: TextStyle(color: ColorConstant.white60),
                    border: InputBorder.none,
                  ),
                  textInputAction: TextInputAction.done,
                  validator: (value) {
                    return HelperFunction.stringValidate(value);
                  },
                ),
              ),
              Container(
                padding: getPadding(left: 16, right: 16,top: 5,bottom: 5),
                margin: getMargin(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CustomImageView(
                      svgPath: ImageConstant.crown,
                      fit: BoxFit.contain,
                      width: getSize(24),
                      height: getSize(24),
                      margin: getMargin(right: 10),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          MyText(
                            title: "Hosted by",
                            clr: ColorConstant.white60,
                          ),
                          const SizedBox(
                            height: 10,
                          ),
                          Row(
                            children: [
                              SizedBox(
                                width: 30,
                                height: 30,
                                child: CustomImageView(
                                  imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
                                  width: 30,
                                  height: 30,
                                  radius: BorderRadius.circular(30),
                                ),
                              ),
                              const SizedBox(
                                width: 15,
                              ),
                              MyText(
                                title: "123 Music",
                                fontSize: 16,
                              ),
                              const Spacer(),
                              GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onTap: (){
                                  Get.toNamed(Routes.ADD_CO_HOST);
                                },
                                child: Container(
                                  decoration: BoxDecoration(
                                    border: Border.all(color: ColorConstant.white60,width: .5),
                                    borderRadius: BorderRadius.circular(20)
                                  ),
                                  padding: getPadding(left: 10,right: 10,top: 5,bottom: 5),
                                  child: MyText(
                                    title: "+add cohosts",
                                    fontSize: 12,
                                      clr: ColorConstant.white60
                                  ),
                                ),
                              ),
                            ],
                          )
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              createEventTile(image: ImageConstant.location,title: "Place name, address, or link"),
              createEventTile(
                  image: ImageConstant.ticket,
                  title: "Tickets",
                  showNextArrow: true,
                  readOnly: true,
                  onTap: (){
                    Get.toNamed(Routes.ADD_DROP);
                  }
              ),
              createEventTile(
                  image: ImageConstant.stadium,
                  title: "Venue Layout(Optional)",
                  showNextArrow: true,
                  readOnly: true,
                onTap: (){
                  Get.toNamed(Routes.VENUE_LAYOUT);
                }
              ),
              createEventTile(
                  image: ImageConstant.settings,
                  title: "Event Settings",
                  showNextArrow: true,
                  readOnly: true,
                  onTap: (){
                    Get.toNamed(Routes.EVENT_SETTINGS);
                  }
              ),
              Padding(
                padding: getPadding(top: 16,bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        MyText(
                          title: "Publish Date",
                          fontSize: 18,
                          clr: ColorConstant.whiteA700,
                          customWeight: FontWeight.bold,
                        ),
                        Spacer(),
                        GestureDetector(
                          onTap: (){
                            controller.showDetailDialog(context);
                          },
                          child: Icon(Icons.info_outline_rounded,color: ColorConstant.whiteA700,),
                        )
                      ],
                    ),
                    MyText(
                      title: "Want to publish?",
                      fontSize: 16,
                      clr: ColorConstant.white60,
                    ),
                    SizedBox(height: getSize(30),),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Obx(()=> CustomButton(
                            text: "Now".tr,
                            variant: controller.isNowSelected.value ? null : ButtonVariant.OutlineWhite,
                            margin: getMargin(right: 10, bottom: 10, ),
                            onTap: () {
                              controller.isNowSelected.value = true;
                              CustomSnackBar.showCustomToast(message: "Current Date Selected");
                              // Get.back();
                            },
                          ),)
                        ),
                        Expanded(
                          child: Obx(()=> CustomButton(
                            prefixWidget: Container(
                              padding: getPadding(right: 7),
                              child: Icon(Icons.calendar_month,color: ColorConstant.whiteA700,size: 20,
                              ),
                            ),
                            text: "Later".tr,
                            variant: !controller.isNowSelected.value ? null :ButtonVariant.OutlineWhite,
                            margin: getMargin(right: 10, bottom: 10, ),
                            onTap: () {
                              Get.toNamed(Routes.SET_DATE,arguments: {"title" : "Dates Active",'fromCreate':true})!.then((value) {
                                if(value!= null){
                                  controller.isNowSelected.value = false;
                                }
                              });;
                            },
                          )),
                        ),
                      ],
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


  Widget createEventTile({required String image,required String title,bool showNextArrow = false,bool readOnly = false,void Function()? onTap}){

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: getPadding(left: 16, right: 16,top: 5,bottom: 5),
        margin: getMargin(bottom: 20),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            CustomImageView(
              svgPath: image,
              onTap: onTap,
              fit: BoxFit.contain,
              width: getSize(24),
              height: getSize(24),
              margin: getMargin(right: 10),
            ),
            Expanded(
              child: TextFormField(
                controller: TextEditingController(),
                onTap: onTap,
                readOnly: readOnly,
                style: GoogleFonts.getFont("Inter",
                    fontSize: 16, color: ColorConstant.whiteA700),
                decoration: InputDecoration(
                  contentPadding: getPadding(
                    right: getSize(15),
                  ),
                  hintText:  title,
                  hintStyle: TextStyle(color: ColorConstant.white60),
                  border: InputBorder.none,
                ),
                keyboardAppearance: Brightness.dark,
              ),
            ),
            showNextArrow ? Container(
              margin: getMargin(left: 15, right: 5),
              child: Icon(
                Icons.arrow_forward_ios,
                color: ColorConstant.white60,
              ),
            ) : Offstage(),
          ],
        ),
      ),
    );
  }
}
